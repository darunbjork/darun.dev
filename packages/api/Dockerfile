FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.15.0

# Copy workspace configuration and package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared-types packages/shared-types
COPY packages/api packages/api

# Build dependencies, generate Prisma client, and build API
RUN pnpm --filter=@darun/shared-types build
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" pnpm --filter=@darun/api exec prisma generate
RUN pnpm --filter=@darun/api build

# Copy static assets into dist
RUN cp packages/api/src/modules/chat/portfolio-context.json packages/api/dist/modules/chat/portfolio-context.json

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy root node_modules and package definitions
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built shared-types package
COPY --from=builder /app/packages/shared-types ./packages/shared-types

# Copy api package
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma

WORKDIR /app/packages/api

EXPOSE 8080

CMD ["node", "dist/app.js"]