# =======================================================
# WhitraWorks API — Production Multi-Stage Dockerfile
# =======================================================

# Stage 1: Base Alpine Environment
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl wget
RUN corepack enable && corepack prepare pnpm@12.9.1 --activate
WORKDIR /app

# Stage 2: Dependencies & Builder
FROM base AS builder

# Copy root workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./

# Copy package manifests
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY packages/config/package.json packages/config/
COPY apps/api/package.json apps/api/

# Install all monorepo dependencies
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma Client & Build Packages
RUN pnpm db:generate
RUN pnpm --filter @whitraworks/types build
RUN pnpm --filter @whitraworks/database build
RUN pnpm --filter @whitraworks/api build

# Stage 3: Minimal Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy root manifests & node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules

# Copy package dists and generated prisma client
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/config ./packages/config

# Copy compiled API artifact
COPY --from=builder /app/apps/api ./apps/api

# Run as non-root user
USER node

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/main.js"]

