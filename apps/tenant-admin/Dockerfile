# =======================================================
# WhitraWorks Tenant Admin — Production Multi-Stage Dockerfile
# =======================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@12.9.1 --activate
WORKDIR /app

# Copy monorepo manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./

# Copy package manifests
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/
COPY apps/tenant-admin/package.json apps/tenant-admin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/types packages/types
COPY packages/ui packages/ui
COPY packages/config packages/config
COPY apps/tenant-admin apps/tenant-admin

# Build dependencies & Tenant Admin
RUN pnpm --filter @whitraworks/types build
RUN pnpm --filter @whitraworks/ui build
RUN pnpm --filter @whitraworks/tenant-admin build

# Stage 2: Production Nginx Server
FROM nginx:1.27-alpine AS runner

# Remove default nginx config & static files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY apps/tenant-admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder
COPY --from=builder /app/apps/tenant-admin/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

