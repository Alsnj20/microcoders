FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS build

RUN apk add --no-cache gcompat
WORKDIR /usr/src/app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/hono/package.json ./packages/hono/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source and build
COPY packages/hono ./packages/hono
RUN pnpm --filter @ss/hono build

# Use pnpm deploy to produce an isolated, production-only bundle
RUN pnpm deploy --filter @ss/hono --prod /prod/hono

# ============================================================
# Stage 2: Minimal production image
# ============================================================
FROM base AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

WORKDIR /app

ENV NODE_ENV=production

# Copy the isolated deploy bundle (includes node_modules + dist)
COPY --from=build --chown=hono:nodejs /prod/hono .

USER hono
EXPOSE 3001

CMD ["node", "dist/index.js"]
