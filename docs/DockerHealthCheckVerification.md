**Day 6 — Docker Compose + Healthchecks + Local Dev Verification**

### 1. Objective
Verify that the full local development stack starts reliably, every healthcheck passes, and `turbo dev` (or the package script) brings the API up with infrastructure already running.

### 2. Why It Matters
A broken local environment wastes hours on later days. Today we lock in a one-command (or two-command) start path that every future day can rely on.

### 3. MERN → Fastify / Monorepo Bridge
In a classic single-repo MERN app you often ran `mongod` + `node server` in two terminals. Here Docker owns Postgres + Redis, Turborepo owns the TypeScript packages, and the API plugin system connects to both services at boot.

### 4. Exact Terminal Commands

```bash
# From monorepo root

# 1. Start infrastructure (idempotent)
docker compose up -d

# 2. Confirm both services are healthy
docker compose ps
# Expected (STATUS column shows "healthy"):
# NAME                 STATUS          PORTS
# darundev_postgres    Up (healthy)    0.0.0.0:5434->5432/tcp
# darundev_redis       Up (healthy)    0.0.0.0:6380->6379/tcp

# 3. (Optional but recommended) Ensure Prisma client is generated
cd packages/api
pnpm exec prisma generate
cd ../..

# 4. Start the API via Turborepo
pnpm turbo dev
# or, if your root package.json has a direct script:
# pnpm dev

# Expected log line:
# api:dev: Server listening on port 3000
# (or similar from your app.ts)
```

If you prefer running only the API package:

```bash
cd packages/api
pnpm dev
```

### 5. Complete Files

No new source files are required today. Confirm the following already exist and are correct:

**`docker-compose.yml` (root)** — the version you created / the one supplied on Day 4 with ports `5434:5432` and `6380:6379`.

**Root `.env`** (must match the Docker host ports):

```env
DATABASE_URL=postgresql://darundev:darundev@localhost:5434/darundev
REDIS_URL=redis://localhost:6380
# … all other required keys from Day 3/4
```

**Root `package.json` scripts** (recommended):

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "test": "turbo test"
  }
}
```

**`turbo.json`** (already set on Day 1 — confirm `"tasks"` not `"pipeline"`):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### 6. The Why
- Docker healthchecks prevent the API from starting against a half-ready Postgres.
- Turborepo’s `dependsOn: ["^build"]` guarantees `@darun/shared-types` is built before the API starts in watch mode.
- Keeping ports configurable (5434 / 6380) avoids collisions with any local Postgres/Redis you already run.

### 7. Common Mistakes
- Starting the API before `docker compose up -d` finishes its healthchecks → connection refused.
- Mismatched ports between `docker-compose.yml` and `.env`.
- Running `pnpm turbo dev` from inside `packages/api` instead of the monorepo root (Turbo expects the workspace root).
- Forgetting `prisma generate` after a schema change → “Cannot find module …/generated/prisma”.

### 8. Security Note
Docker Compose is for local development only. Never expose the Postgres or Redis ports publicly. In production you will use managed services (Neon, Upstash, etc.) with private networking and strong credentials.

### 9. Verification Checklist

```bash
# Infrastructure healthy
docker compose ps
# both "healthy"

# API responds
curl http://localhost:3000/health
# Expected:
# {"status":"ok","timestamp":"...","services":{"db":"ok","redis":"ok"}}

# Correlation ID present
curl -v http://localhost:3000/health 2>&1 | grep -i correlation
# Expected: X-Correlation-ID: <uuid>

# Swagger UI reachable
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/docs
# Expected: 200 (or 302)

# Type-check still clean
pnpm turbo type-check
# Expected: 0 errors
```

### 10. Git Commit Message
```bash
git add .
git commit -m "day-06: Docker healthchecks verified, turbo dev starts full local stack"
```

### 11. Stop Gate
Confirm **all** of the following before moving on:

1. `docker compose ps` shows both services as **healthy**.
2. `pnpm turbo dev` (or `pnpm dev`) starts the API on port 3000 without errors.
3. `curl /health` returns `"status":"ok"` with both `db` and `redis` equal to `"ok"`.
4. Every response carries an `X-Correlation-ID` header.
5. Swagger UI is reachable at `/api/docs`.