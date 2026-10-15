#!/usr/bin/env bash
# ==============================================================================
# WhitraWorks Platform — Staging Deployment Script
# Target: Azure VM (Standard_B2ats_v2: 2 vCPU, 1 GiB RAM)
# Environment: stage.whitraworks.online
# ==============================================================================
# Strict execution mode
set -Eeuo pipefail

# Determine repository root relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# ------------------------------------------------------------------------------
# Configuration with Overridable Defaults
# ------------------------------------------------------------------------------
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.stage.yml}"
ENV_FILE="${ENV_FILE:-.env.stage}"

API_SERVICE="api"
OPS_SERVICE="ops-admin"
TENANT_SERVICE="tenant-admin"

API_CONTAINER="${API_CONTAINER:-whitraworks-stage-api}"
OPS_CONTAINER="${OPS_CONTAINER:-whitraworks-stage-ops-admin}"
TENANT_CONTAINER="${TENANT_CONTAINER:-whitraworks-stage-tenant-admin}"
GATEWAY_CONTAINER="${GATEWAY_CONTAINER:-whitraworks-stage-gateway}"

API_IMAGE_TAG="ghcr.io/sivaganesz/whitraworks-api:stage"
OPS_IMAGE_TAG="ghcr.io/sivaganesz/whitraworks-ops-admin:stage"
TENANT_IMAGE_TAG="ghcr.io/sivaganesz/whitraworks-tenant-admin:stage"

STARTUP_GRACE_SECONDS="${STARTUP_GRACE_SECONDS:-4}"
MAX_HEALTH_ATTEMPTS="${MAX_HEALTH_ATTEMPTS:-12}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-5}"

RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"
DB_MIGRATE_CMD="${DB_MIGRATE_CMD:-prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate}"

ENABLE_ROLLBACK="${ENABLE_ROLLBACK:-1}"

LOCK_FILE="${LOCK_FILE:-/tmp/whitraworks-staging-deploy.lock}"
LOCK_DIR="${LOCK_DIR:-/tmp/whitraworks-staging-deploy.lockdir}"

# Tracking flags
MIGRATION_EXECUTED=0
CONTAINERS_RECREATED=0
PREV_API_IMAGE=""
PREV_OPS_IMAGE=""
PREV_TENANT_IMAGE=""
LOCK_ACQUIRED=""

# Docker execution command array (defaults to direct docker, auto-detects sudo -n)
DOCKER_CMD=("docker")

# ------------------------------------------------------------------------------
# Logging Utilities (Guaranteed Zero Secret Leakage)
# ------------------------------------------------------------------------------
log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]  $*"
}

log_warn() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [WARN]  $*" >&2
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
}

# ------------------------------------------------------------------------------
# Docker Command Execution Strategy (Direct vs Passwordless Sudo)
# ------------------------------------------------------------------------------
detect_docker_runner() {
    if [[ -n "${DOCKER_RUNNER:-}" ]]; then
        read -r -a DOCKER_CMD <<< "${DOCKER_RUNNER}"
        log_info "Docker runner: using explicit DOCKER_RUNNER override: '${DOCKER_CMD[*]}'."
        return 0
    fi

    if docker info >/dev/null 2>&1; then
        DOCKER_CMD=("docker")
        log_info "Docker runner: verified direct non-root access ('docker')."
    elif command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
        DOCKER_CMD=("sudo" "-n" "docker")
        log_info "Docker runner: direct access unavailable; verified passwordless sudo ('sudo -n docker')."
    else
        DOCKER_CMD=("docker")
        log_warn "Docker runner: neither direct access nor 'sudo -n' connected to Docker daemon."
    fi
}

# ------------------------------------------------------------------------------
# Concurrency Lock (Flock with Atomic Mkdir Fallback)
# ------------------------------------------------------------------------------
acquire_lock() {
    log_info "Checking deployment concurrency lock..."
    if command -v flock >/dev/null 2>&1; then
        if ! exec 200>>"${LOCK_FILE}"; then
            log_error "Cannot open deployment lock file '${LOCK_FILE}' (permission denied or unwriteable). Aborting."
            exit 1
        fi
        if ! flock -n 200; then
            log_error "Another deployment is actively running (lock held on ${LOCK_FILE}). Aborting."
            exit 1
        fi
        LOCK_ACQUIRED="flock"
    else
        if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
            log_error "Another deployment is actively running (lockdir held on ${LOCK_DIR}). Aborting."
            exit 1
        fi
        echo "$$" > "${LOCK_DIR}/pid" 2>/dev/null || true
        LOCK_ACQUIRED="mkdir"
    fi

    # Register traps to ensure lock is released on termination signals or script exit
    trap 'cleanup_lock_on_signal' INT TERM HUP
    trap 'release_lock' EXIT
    log_info "Deployment lock acquired successfully."
}

cleanup_lock_on_signal() {
    log_warn "Interruption signal received. Releasing lock and exiting..."
    release_lock
    exit 130
}

release_lock() {
    if [[ "${LOCK_ACQUIRED}" == "mkdir" ]]; then
        if [[ -d "${LOCK_DIR}" ]]; then
            # Verify ownership via PID file before removing to never remove another process's lock
            if [[ -f "${LOCK_DIR}/pid" ]]; then
                local lock_pid
                lock_pid="$(cat "${LOCK_DIR}/pid" 2>/dev/null || echo "")"
                if [[ "${lock_pid}" == "$$" ]]; then
                    rm -f "${LOCK_DIR}/pid" 2>/dev/null || true
                    rmdir "${LOCK_DIR}" 2>/dev/null || true
                fi
            fi
        fi
        LOCK_ACQUIRED=""
    elif [[ "${LOCK_ACQUIRED}" == "flock" ]]; then
        flock -u 200 2>/dev/null || true
        LOCK_ACQUIRED=""
    fi
}

# ------------------------------------------------------------------------------
# Rollback & Recovery Handler
# ------------------------------------------------------------------------------
execute_rollback() {
    local orig_exit_code="${1:-$?}"
    if [[ "${orig_exit_code}" -eq 0 ]]; then
        orig_exit_code=1
    fi

    # Disable ERR trap immediately to prevent recursive invocations
    trap '' ERR

    log_warn "============================================================"
    log_warn "Executing deployment failure recovery procedure (trigger exit code: ${orig_exit_code})..."
    log_warn "============================================================"

    # If failure happened before container recreation, running containers are intact
    if [[ "${CONTAINERS_RECREATED}" -ne 1 ]]; then
        log_info "Failure occurred prior to container recreation. Existing application containers remain intact and running."
        if [[ "${MIGRATION_EXECUTED}" -eq 1 ]]; then
            log_warn "NOTICE: Database migration was executed before failure. Database schema changes were NOT reverted."
        fi
        release_lock
        exit "${orig_exit_code}"
    fi

    if [[ "${ENABLE_ROLLBACK}" != "1" ]]; then
        log_warn "Automatic rollback is disabled (ENABLE_ROLLBACK=${ENABLE_ROLLBACK}). Unhealthy containers remain in place for inspection."
        release_lock
        exit "${orig_exit_code}"
    fi

    if [[ -z "${PREV_API_IMAGE}" || -z "${PREV_OPS_IMAGE}" || -z "${PREV_TENANT_IMAGE}" ]]; then
        log_error "Cannot safely restore prior containers: missing one or more pre-deployment image IDs."
        log_error "  API:          ${PREV_API_IMAGE:-MISSING}"
        log_error "  Ops Admin:    ${PREV_OPS_IMAGE:-MISSING}"
        log_error "  Tenant Admin: ${PREV_TENANT_IMAGE:-MISSING}"
        release_lock
        exit "${orig_exit_code}"
    fi

    log_warn "Restoring previous image tags:"
    log_warn "  API:          ${PREV_API_IMAGE} -> ${API_IMAGE_TAG}"
    log_warn "  Ops Admin:    ${PREV_OPS_IMAGE} -> ${OPS_IMAGE_TAG}"
    log_warn "  Tenant Admin: ${PREV_TENANT_IMAGE} -> ${TENANT_IMAGE_TAG}"

    local rollback_failed=0
    "${DOCKER_CMD[@]}" tag "${PREV_API_IMAGE}" "${API_IMAGE_TAG}" 2>/dev/null || rollback_failed=1
    "${DOCKER_CMD[@]}" tag "${PREV_OPS_IMAGE}" "${OPS_IMAGE_TAG}" 2>/dev/null || rollback_failed=1
    "${DOCKER_CMD[@]}" tag "${PREV_TENANT_IMAGE}" "${TENANT_IMAGE_TAG}" 2>/dev/null || rollback_failed=1

    log_warn "Recreating application containers targeting restored previous images..."
    if [[ "${rollback_failed}" -eq 0 ]] && "${DOCKER_CMD[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --no-deps "${API_SERVICE}" "${OPS_SERVICE}" "${TENANT_SERVICE}"; then
        log_warn "Application containers successfully reverted to previous images."
        log_warn "Reloading Nginx gateway to synchronize restored container IPs..."
        if "${DOCKER_CMD[@]}" exec "${GATEWAY_CONTAINER}" nginx -s reload 2>/dev/null; then
            log_warn "Gateway successfully reloaded after container rollback."
        else
            log_error "WARNING: Rollback restored containers, but Nginx gateway reload failed inside '${GATEWAY_CONTAINER}'! Stale upstream routes may persist until gateway is manually reloaded."
        fi
    else
        log_error "CRITICAL: Rollback recreation failed! Application containers could not be restored to previous images."
    fi

    if [[ "${MIGRATION_EXECUTED}" -eq 1 ]]; then
        log_error "CRITICAL RECOVERY NOTICE:"
        log_error "  Database migrations were applied prior to failure."
        log_error "  Reverting container images does NOT undo database schema changes."
        log_error "  Manual database inspection is required if breaking schema changes were introduced."
    fi

    log_warn "Container logs for failed deployment diagnostics:"
    "${DOCKER_CMD[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" logs --tail 30 "${API_SERVICE}" 2>/dev/null || true

    release_lock
    exit "${orig_exit_code}"
}

# ------------------------------------------------------------------------------
# Pre-Flight Validation
# ------------------------------------------------------------------------------
validate_prerequisites() {
    log_info "Step 1/6: Validating prerequisites and capturing container state..."

    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker CLI is not installed or not in PATH."
        exit 1
    fi

    detect_docker_runner

    if ! "${DOCKER_CMD[@]}" info >/dev/null 2>&1; then
        log_error "Docker daemon is not accessible via '${DOCKER_CMD[*]} info'."
        log_error "Ensure Docker is running and azureuser has direct Docker permissions or passwordless sudo."
        exit 1
    fi

    if ! "${DOCKER_CMD[@]}" compose version >/dev/null 2>&1; then
        log_error "Docker Compose (v2) plugin is not available via '${DOCKER_CMD[*]} compose'."
        exit 1
    fi

    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        log_error "Compose file '${COMPOSE_FILE}' does not exist in ${REPO_ROOT}."
        exit 1
    fi

    if [[ ! -f "${ENV_FILE}" ]]; then
        log_error "Environment file '${ENV_FILE}' not found in ${REPO_ROOT}."
        exit 1
    fi

    # Record current running image IDs before pulling new images (without leaking secrets)
    PREV_API_IMAGE="$("${DOCKER_CMD[@]}" inspect --format='{{.Image}}' "${API_CONTAINER}" 2>/dev/null || true)"
    PREV_OPS_IMAGE="$("${DOCKER_CMD[@]}" inspect --format='{{.Image}}' "${OPS_CONTAINER}" 2>/dev/null || true)"
    PREV_TENANT_IMAGE="$("${DOCKER_CMD[@]}" inspect --format='{{.Image}}' "${TENANT_CONTAINER}" 2>/dev/null || true)"

    if [[ -n "${PREV_API_IMAGE}" ]]; then
        log_info "Captured running API image:          ${PREV_API_IMAGE}"
        log_info "Captured running Ops Admin image:    ${PREV_OPS_IMAGE:-N/A}"
        log_info "Captured running Tenant Admin image: ${PREV_TENANT_IMAGE:-N/A}"
    else
        log_info "No currently running application containers detected (initial bringup or stopped state)."
    fi

    log_info "Prerequisites verified."
}

# ------------------------------------------------------------------------------
# Image Pulling
# ------------------------------------------------------------------------------
pull_images() {
    log_info "Step 2/6: Pulling latest :stage images from GitHub Container Registry..."
    "${DOCKER_CMD[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" pull "${API_SERVICE}" "${OPS_SERVICE}" "${TENANT_SERVICE}"
    log_info "Application images pulled successfully."
}

# ------------------------------------------------------------------------------
# Database Migration
# ------------------------------------------------------------------------------
run_database_migration() {
    if [[ "${RUN_MIGRATIONS}" != "1" ]]; then
        log_info "Step 3/6: Skipping database migration (RUN_MIGRATIONS=${RUN_MIGRATIONS})."
        return 0
    fi

    log_info "Step 3/6: Executing database schema migration via ephemeral container (${DB_MIGRATE_CMD})..."
    log_warn "Notice: Prisma db:push does not support automatic down-migrations. Breaking schema changes cannot be automatically rolled back."

    read -r -a migrate_cmd_array <<< "${DB_MIGRATE_CMD}"
    if "${DOCKER_CMD[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" run --rm "${API_SERVICE}" "${migrate_cmd_array[@]}"; then
        MIGRATION_EXECUTED=1
        log_info "Database migration completed successfully."
    else
        log_error "Database migration failed! Halting deployment prior to service recreation."
        exit 1
    fi
}

# ------------------------------------------------------------------------------
# Application Service Recreation
# ------------------------------------------------------------------------------
recreate_services() {
    log_info "Step 4/6: Recreating application services (--no-deps)..."
    # Recreate ONLY api, ops-admin, and tenant-admin without restarting postgres, redis, or gateway
    "${DOCKER_CMD[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --no-deps "${API_SERVICE}" "${OPS_SERVICE}" "${TENANT_SERVICE}"
    CONTAINERS_RECREATED=1
    log_info "Service recreation command issued."
}

# ------------------------------------------------------------------------------
# Health Checks & Verification
# ------------------------------------------------------------------------------
verify_health() {
    log_info "Step 5/6: Verifying container health status (startup grace: ${STARTUP_GRACE_SECONDS}s, max attempts: ${MAX_HEALTH_ATTEMPTS})..."
    sleep "${STARTUP_GRACE_SECONDS}"

    local attempt=1
    local api_healthy=0
    local ops_healthy=0
    local tenant_healthy=0

    while [[ ${attempt} -le ${MAX_HEALTH_ATTEMPTS} ]]; do
        log_info "Health check attempt ${attempt}/${MAX_HEALTH_ATTEMPTS}..."

        # Early crash detection: fail fast if any container entered exited, dead, or restarting state
        for container_name in "${API_CONTAINER}" "${OPS_CONTAINER}" "${TENANT_CONTAINER}"; do
            local container_status
            container_status="$("${DOCKER_CMD[@]}" inspect --format='{{.State.Status}}' "${container_name}" 2>/dev/null || echo "not_found")"
            if [[ "${container_status}" == "exited" || "${container_status}" == "dead" || "${container_status}" == "restarting" ]]; then
                log_error "Container '${container_name}' entered unrecoverable state (Status: ${container_status})!"
                return 1
            fi
        done

        # 1. API Health Check
        if "${DOCKER_CMD[@]}" exec "${API_CONTAINER}" wget -qO- http://localhost:4000/health 2>/dev/null | grep -q '"status":"healthy"'; then
            api_healthy=1
        else
            api_healthy=0
        fi

        # 2. Ops Admin Health Check
        if "${DOCKER_CMD[@]}" exec "${OPS_CONTAINER}" wget -qO- http://127.0.0.1/health 2>/dev/null | grep -q 'OK\|healthy\|200' || \
           "${DOCKER_CMD[@]}" exec "${OPS_CONTAINER}" wget -q --spider http://127.0.0.1/health 2>/dev/null; then
            ops_healthy=1
        else
            ops_healthy=0
        fi

        # 3. Tenant Admin Health Check
        if "${DOCKER_CMD[@]}" exec "${TENANT_CONTAINER}" wget -qO- http://127.0.0.1/health 2>/dev/null | grep -q 'OK\|healthy\|200' || \
           "${DOCKER_CMD[@]}" exec "${TENANT_CONTAINER}" wget -q --spider http://127.0.0.1/health 2>/dev/null; then
            tenant_healthy=1
        else
            tenant_healthy=0
        fi

        if [[ ${api_healthy} -eq 1 && ${ops_healthy} -eq 1 && ${tenant_healthy} -eq 1 ]]; then
            log_info "All application services verified healthy!"
            log_info "  - API:          HEALTHY (http://localhost:4000/health)"
            log_info "  - Ops Admin:    HEALTHY (http://127.0.0.1/health)"
            log_info "  - Tenant Admin: HEALTHY (http://127.0.0.1/health)"
            return 0
        fi

        log_info "Waiting for health checks: API=${api_healthy}, Ops=${ops_healthy}, Tenant=${tenant_healthy}..."
        sleep "${HEALTH_INTERVAL_SECONDS}"
        attempt=$((attempt + 1))
    done

    log_error "Health checks timed out after ${MAX_HEALTH_ATTEMPTS} attempts."
    log_error "Status summary: API=${api_healthy}, Ops=${ops_healthy}, Tenant=${tenant_healthy}"
    return 1
}

# ------------------------------------------------------------------------------
# Gateway Configuration Validation & Graceful Reload
# ------------------------------------------------------------------------------
reload_gateway() {
    log_info "Step 6/6: Validating and reloading Nginx gateway configuration to sync container IPs..."

    local gateway_status
    gateway_status="$("${DOCKER_CMD[@]}" inspect --format='{{.State.Status}}' "${GATEWAY_CONTAINER}" 2>/dev/null || echo "not_found")"

    if [[ "${gateway_status}" != "running" ]]; then
        log_error "Gateway container '${GATEWAY_CONTAINER}' is not running (status: ${gateway_status}). Cannot reload Nginx."
        return 1
    fi

    log_info "Testing Nginx gateway configuration syntax inside '${GATEWAY_CONTAINER}'..."
    if ! "${DOCKER_CMD[@]}" exec "${GATEWAY_CONTAINER}" nginx -t; then
        log_error "Nginx gateway configuration test failed inside '${GATEWAY_CONTAINER}'! Aborting deployment."
        return 1
    fi

    log_info "Gracefully reloading Nginx gateway inside '${GATEWAY_CONTAINER}'..."
    if ! "${DOCKER_CMD[@]}" exec "${GATEWAY_CONTAINER}" nginx -s reload; then
        log_error "Failed to reload Nginx gateway inside '${GATEWAY_CONTAINER}'!"
        return 1
    fi
    sleep 1

    log_info "Nginx gateway configuration validated and reloaded successfully."
}

# ------------------------------------------------------------------------------
# Main Flow
# ------------------------------------------------------------------------------
main() {
    log_info "============================================================"
    log_info "Starting WhitraWorks Staging Deployment"
    log_info "Repository root: ${REPO_ROOT}"
    log_info "Compose file:    ${COMPOSE_FILE}"
    log_info "============================================================"

    # Register rollback trap for unhandled failures, capturing exit code
    trap 'execute_rollback $?' ERR

    acquire_lock
    validate_prerequisites
    pull_images
    run_database_migration
    recreate_services
    verify_health
    reload_gateway

    # Clear traps on success and release lock
    trap - ERR
    trap - INT TERM HUP EXIT
    release_lock

    log_info "============================================================"
    log_info "Deployment completed successfully!"
    log_info "============================================================"
}

main "$@"
