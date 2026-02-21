# Stage 1: Install dependencies
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

# Stage 2: Build client
FROM deps AS client-build
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/client/ ./apps/client/
# Copy Havok WASM to client public (may be hoisted or in workspace node_modules)
RUN mkdir -p apps/client/public && \
    cp $(find /app -path "*/\@babylonjs/havok/lib/esm/HavokPhysics.wasm" -print -quit) apps/client/public/
RUN cd apps/client && bunx vite build

# Stage 3: Build server
FROM deps AS server-build
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/
RUN cd apps/server && bun build src/main.ts --outdir dist --target bun --external colyseus --external @colyseus/ws-transport --external @colyseus/schema

# Stage 4: Production image
FROM oven/bun:1.3-alpine AS production
WORKDIR /app

# Copy server build
COPY --from=server-build /app/apps/server/dist ./dist/

# Copy Drizzle migration files (applied at startup)
COPY --from=server-build /app/apps/server/drizzle ./drizzle/

# Install external runtime dependencies (colyseus, ws-transport, schema)
# These are --external in the server bundle and must be available at runtime
RUN bun init -y > /dev/null 2>&1 && \
    bun add colyseus@0.15.57 @colyseus/ws-transport@0.15.3 @colyseus/schema@2.0.35

# Copy client build as static files
COPY --from=client-build /app/apps/client/dist ./public/
# Copy Havok WASM
COPY --from=client-build /app/apps/client/public/HavokPhysics.wasm ./public/

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567

CMD ["bun", "run", "dist/main.js"]
