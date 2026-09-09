FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.15.0

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

# Install dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared-types packages/shared-types
COPY packages/api packages/api

# Build shared-types and API
RUN pnpm --filter=@darun/shared-types build
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" pnpm --filter=@darun/api exec prisma generate
RUN pnpm --filter=@darun/api build

# Copy static asset
RUN cp packages/api/src/modules/chat/portfolio-context.json packages/api/dist/modules/chat/portfolio-context.json

# 🔥 Deploy the API package (resolves all symlinks)
RUN pnpm deploy --filter=@darun/api --prod /app/deploy

# Production runner
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy only the deployed package (self-contained)
COPY --from=builder /app/deploy ./

WORKDIR /app/packages/api

EXPOSE 8080

CMD ["node", "dist/app.js"]