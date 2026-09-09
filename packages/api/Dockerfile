FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY packages/api packages/api

RUN pnpm --filter=@darun/shared-types build

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN pnpm --filter=@darun/api exec prisma generate
RUN pnpm --filter=@darun/api build

# Copy portfolio context
RUN mkdir -p packages/api/dist/modules/chat \
  && cp packages/api/src/modules/chat/portfolio-context.json packages/api/dist/modules/chat/portfolio-context.json 2>/dev/null || true

# Self-contained deploy
RUN pnpm --filter=@darun/api deploy --prod /app/deploy

# Ensure dist and prisma are inside the deploy folder
RUN cp -R packages/api/dist /app/deploy/dist \
  && mkdir -p /app/deploy/prisma \
  && cp -R packages/api/prisma /app/deploy/prisma \
  && cp packages/api/prisma.config.ts /app/deploy/prisma.config.ts 2>/dev/null || true

# ----- PRODUCTION STAGE -----
FROM node:22-alpine

WORKDIR /app   # <<< CRITICAL: NOT /app/packages/api

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/deploy ./

EXPOSE 8080

# Entry point is now relative to /app
CMD ["node", "dist/app.js"]