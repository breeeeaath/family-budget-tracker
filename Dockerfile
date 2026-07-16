# region MODULE_CONTRACT [DOMAIN(9): DevOps, CloudDeployment; CONCEPT(9): Containerization, MultiStage; TECH(9): Docker, Node.js, esbuild, Cloud Run]
## @modulecontract
## @purpose To containerize the Family Budget Tracker for deployment on Google Cloud Run — multi-stage build isolates the heavy Vite/React compilation from the lean production runtime image.
## @scope Base Node.js image, dependency install with native modules (better-sqlite3), frontend + backend build, production runtime.
## @input Source code in walet/.
## @output Docker image (~300MB) ready for Cloud Run.
## @links [TARGET: Google Cloud Run, Artifact Registry]
## @invariants
## - Production image runs Node.js 22 (LTS).
## - better-sqlite3 native addon compiled during npm install.
## - server.ts listens on process.env.PORT (Cloud Run requirement).
## - Static files served from /app/dist (vite build output).
## @rationale
## Q: Why multi-stage build instead of a single stage?
## A: The build stage (Vite + esbuild + tailwindcss) pulls ~800MB of dev dependencies. Multi-stage strips devDependencies, producing a ~300MB runtime image — faster deploys and lower attack surface.
## Q: Why esbuild --format=cjs?
## A: better-sqlite3 is a native CJS module. The bundled server runs as CommonJS for maximum compatibility with native Node.js addons.
## @changes
## LAST_CHANGE: [v1.0.0 — Initial Dockerfile for Cloud Run deployment]
## @modulemap
## STAGE 9[Install deps + compile native modules + build frontend/backend] => builder
## STAGE 10[Production runtime: only prod deps + built artifacts] => production
function _module_contract(): void {}
# endregion MODULE_CONTRACT
# GREP_SUMMARY: Docker, Dockerfile, Cloud Run, deployment, container, Node.js, better-sqlite3, multi-stage
# STRUCTURE: ▶ Stage1(builder): ┌node:22┐ → ┌npm ci (all deps)┐ → ┌vite build (React)┐ → ┌esbuild bundle server┐ → ▶ Stage2(production): ┌node:22-slim┐ → ┌npm ci --omit=dev┐ → ┌COPY dist/ from builder┐ → ⚡ CMD node dist/server.cjs

# ============================================================
# Stage 1: BUILD — compile React frontend + bundle server
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build React frontend (Vite → dist/)
RUN npx vite build

# Bundle server to CJS (better-sqlite3 compatible)
RUN npx esbuild server.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --packages=external \
    --sourcemap \
    --outfile=dist/server.cjs

# ============================================================
# Stage 2: PRODUCTION — lean runtime image
# ============================================================
FROM node:22-alpine

WORKDIR /app

# Install OS-level deps for better-sqlite3 native compilation
# python3 + make + g++ are needed because better-sqlite3 compiles from source
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install ONLY production dependencies (better-sqlite3 native addon compiles here)
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite database
# Cloud Run provides an ephemeral writable /tmp filesystem
RUN mkdir -p /tmp/data && ln -sf /tmp/data /app/data

# Cloud Run injects PORT env var (default 8080)
# Health check: pings API endpoint every 30s
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check using the Node.js process
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "const http=require('http');http.get('http://localhost:'+(process.env.PORT||8080)+'/api/expenses',r=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "dist/server.cjs"]
