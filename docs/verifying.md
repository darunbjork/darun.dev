**Day 5 — PostgreSQL + Prisma: Full Schema Migration + pgvector**

### 1. Objective
Run the complete Prisma 7 migration, verify all 9 tables exist with the correct columns, enable the `pgvector` extension, and confirm the generated client is usable by the Fastify plugins.

### 2. Why It Matters
Until the tables exist in PostgreSQL, every domain service (projects, visitors, feedback, chat) will fail. pgvector is required later for any semantic-search / embedding features. Getting the migration clean today prevents schema drift for the rest of the bootcamp.

### 3. MERN → Fastify / Prisma 7 Bridge
In classic MERN you often wrote raw Mongoose schemas or SQL by hand. Here Prisma owns the schema, migrations, and type-safe client. Prisma 7 moved the connection URL out of `schema.prisma` into `prisma.config.ts` and requires a driver adapter — that is already handled from Day 4.

### 4. Exact Terminal Commands

```bash
# From monorepo root
docker compose up -d
docker compose ps
# Expected: both containers healthy (your ports 5434 / 6380)

cd packages/api

# 1. Ensure the schema is the full one from Day 4
#    (no url inside datasource, provider = "prisma-client", output = "../src/generated/prisma")

# 2. Enable pgvector (idempotent)
docker exec darundev_postgres psql -U darundev -d darundev \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
# Expected: CREATE EXTENSION  (or NOTICE that it already exists)

# 3. Generate client + run migration
pnpm exec prisma generate
pnpm exec prisma migrate dev --name init
# Expected:
# ✔ Generated Prisma Client
# ✔ Created / Applied migration

# 4. Optional visual check
pnpm exec prisma studio
# Opens http://localhost:5555 — you should see all 9 tables
```

If you already ran a partial migration on Day 4, you can still run:

```bash
pnpm exec prisma migrate dev --name init
```

Prisma will detect the current state and only apply missing changes (or tell you the database is already in sync).

### 5. Complete Files (already delivered on Day 4 — confirm they match)

- `packages/api/prisma/schema.prisma` → full schema with Admin, Project, ProjectImage, Visitor, ProjectView, Feedback, ChatSession, ChatMessage, ChatNotes (and PasswordResetToken).
- `packages/api/prisma.config.ts` → loads root `.env` and supplies `datasource.url`.
- `packages/api/src/plugins/prisma.plugin.ts` → uses `@prisma/adapter-pg` + generated client path.

No new source files are required today. The work is migration + verification.

### 6. The Why
- `CREATE EXTENSION vector` must be done **before** or **right after** the first migration so later embedding columns (if added) succeed.
- Prisma 7 no longer auto-runs `generate` after every migrate in all contexts — explicit `prisma generate` is safer.
- Verifying with `\dt` and Prisma Studio catches typos in model names / relations early.

### 7. Common Mistakes
- Leaving `url = env("DATABASE_URL")` inside `schema.prisma` → Prisma 7 validation error.
- Running `prisma migrate` while Docker Postgres is not healthy → connection refused.
- Forgetting the adapter when the plugin instantiates `PrismaClient` → runtime “adapter required” error.
- Using the wrong container name in `docker exec` (yours is `darundev_postgres`).

### 8. Security Note
The database user/password in Docker is for **local development only**. In production you will use Neon (or another managed Postgres) with strong credentials and network restrictions. Never commit real production connection strings.

### 9. Verification Checklist

```bash
# Tables exist
docker exec darundev_postgres psql -U darundev -d darundev -c "\dt"
# Expected: admins, projects, project_images, visitors, project_views,
#           feedback, chat_sessions, chat_messages, chat_notes,
#           password_reset_tokens  (and _prisma_migrations)

# pgvector present
docker exec darundev_postgres psql -U darundev -d darundev \
  -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
# Expected: one row

# Generated client exists
ls packages/api/src/generated/prisma/
# Expected: client.js / client.d.ts (or equivalent generated files)

# Health still green
curl http://localhost:3000/health
# Expected: {"status":"ok", ..., "services":{"db":"ok","redis":"ok"}}

# Type-check still clean
cd packages/api && pnpm type-check
```

### 10. Git Commit Message
```bash
git add .
git commit -m "day-05: Prisma 7 full schema migration — 9 tables + pgvector enabled"
```

### 11. Stop Gate
Confirm **all** of the following before moving on:

1. `\dt` lists the 9 domain tables + `_prisma_migrations`.
2. `pg_extension` shows the `vector` extension.
3. `src/generated/prisma/` contains the client files.
4. `curl /health` reports `db: "ok"`.
5. `pnpm type-check` has zero errors.
