# ==========================================
# 1. Base Stage: Node & PNPM Setup
# ==========================================
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@10.2.0 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# ==========================================
# 2. Dependencies Stage
# ==========================================
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/server/package.json ./apps/server/

# Cache mount cho pnpm store -> Tăng tốc cài đặt
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ==========================================
# 3. Build Stage
# ==========================================
FROM base AS builder
WORKDIR /app

# Copy node_modules từ deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

# Copy source code
COPY . .

# Rebuild native modules SAU KHI có source code
RUN pnpm rebuild @prisma/engines prisma esbuild sharp 2>/dev/null || true

# Generate Prisma Client & Build NestJS App
RUN pnpm --filter backend prisma:generate
RUN pnpm --filter backend build

# Prune devDependencies để lọc sạch thư viện dev không dùng
WORKDIR /app
RUN pnpm prune --prod

# ==========================================
# 4. Production Runner Stage
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy chỉ những artifact nhẹ nhất phục vụ runtime
COPY --from=builder --chown=nestjs:nodejs /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/docker-entrypoint.sh ./apps/server/docker-entrypoint.sh

RUN chmod +x ./apps/server/docker-entrypoint.sh

USER nestjs

EXPOSE 8080

ENTRYPOINT ["/app/apps/server/docker-entrypoint.sh"]
CMD ["node", "apps/server/dist/main.js"]