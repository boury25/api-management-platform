# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install OpenSSL so Prisma can detect the correct engine binary
RUN apk add --no-cache openssl

WORKDIR /app

# Install ALL dependencies (dev + prod) for build
COPY package*.json ./
RUN npm install

# Copy source and config files
COPY tsconfig.json ./
COPY tsconfig.seed.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client (for the alpine musl target)
RUN npx prisma generate

# Build main TypeScript application
RUN npm run build

# Compile seed script (outputs to dist-seed/)
RUN npx tsc --project tsconfig.seed.json

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Install OpenSSL so Prisma engine can load libssl.so.3 at runtime
RUN apk add --no-cache openssl

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy manifests and compiled artifacts from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies (includes prisma CLI, now in dependencies)
RUN npm install --only=production && npm cache clean --force

# Overwrite with builder-generated Prisma client (correct alpine binary target)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy and permission the startup script (must happen as root, before USER switch)
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Create logs directory owned by app user
RUN mkdir -p logs && chown appuser:appgroup logs

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["sh", "start.sh"]
