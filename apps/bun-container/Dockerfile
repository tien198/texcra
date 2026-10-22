# Both stages use glibc so pnpm selects the native linux Sharp binaries.
FROM node:24-bookworm-slim AS dependencies
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/bun-container/package.json apps/bun-container/package.json
RUN pnpm --filter bun-container... install --prod --frozen-lockfile

FROM oven/bun:1.4.3-debian AS runtime
WORKDIR /workspace
COPY --from=dependencies /workspace /workspace
COPY packages/shared/src packages/shared/src
COPY apps/bun-container/src apps/bun-container/src
USER bun
EXPOSE 3001
CMD ["bun", "apps/bun-container/src/server.ts"]
