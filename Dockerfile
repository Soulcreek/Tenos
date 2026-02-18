# Stage 1: Install dependencies
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
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
RUN cd apps/server && bun build src/main.ts --outdir dist --target bun

# Stage 4: Production image
FROM oven/bun:1.3-alpine AS production
WORKDIR /app

# Copy server build
COPY --from=server-build /app/apps/server/dist ./dist/
# Copy client build as static files
COPY --from=client-build /app/apps/client/dist ./public/
# Copy Havok WASM
COPY --from=client-build /app/apps/client/public/HavokPhysics.wasm ./public/

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567

CMD ["bun", "run", "dist/main.js"]
