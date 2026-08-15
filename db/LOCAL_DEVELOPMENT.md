# Local PostgreSQL development

This setup is deliberately separate from Neon:

- It uses the local Docker volume `brackeroni-local_postgres-data`.
- PostgreSQL is bound only to `127.0.0.1:54329`.
- It does not edit `.env.local` or contact Neon.

## Start local PostgreSQL

From the repository root:

```powershell
docker compose -p brackeroni-local -f docker-compose.local.yml up -d
```

Check that the database is ready:

```powershell
docker compose -p brackeroni-local -f docker-compose.local.yml ps
```

## Use it for this terminal only

Set the connection string before any database or Next.js command. This overrides
the Neon `DATABASE_URL` in `.env.local` only for the current PowerShell session.

```powershell
$env:DATABASE_URL = "postgresql://brackeroni:brackeroni_local_dev@127.0.0.1:54329/brackeroni"
```

Confirm the connection and apply the existing migrations:

```powershell
npm.cmd run db:check
npm.cmd run db:migrate
```

Run the app from that same PowerShell session when you want it to use local PostgreSQL:

```powershell
npm.cmd run dev
```

Open a new PowerShell window without setting `DATABASE_URL` to use the existing
Neon value from `.env.local` again.

## Stop or reset local data

Stop the local database without deleting its data:

```powershell
docker compose -p brackeroni-local -f docker-compose.local.yml down
```

Delete local database data only when you intentionally want a fresh database:

```powershell
docker compose -p brackeroni-local -f docker-compose.local.yml down --volumes
```

## Database diagnostics

When `DATABASE_URL` points at the local Docker database, API calls automatically
append one JSON object per request to `logs/local-db-trace.jsonl`. Each record
has the endpoint, HTTP status, response JSON size, elapsed request time, and
the SQL statements it executed. Parameter values are deliberately never logged.

After reproducing a workflow, inspect the local trace file or ask Codex to
analyze it.

For aggregate PostgreSQL query costs, `pg_stat_statements` is enabled in
`docker-compose.local.yml`. Recreate the local PostgreSQL container once to
apply the preload setting; the Docker volume preserves existing local data:

```powershell
docker compose -p brackeroni-local -f docker-compose.local.yml up -d --force-recreate postgres
```

Then reset counters before a focused session and print the most expensive
statements afterward:

```powershell
npm.cmd run db:diagnostics:reset
npm.cmd run db:diagnostics
```

These commands refuse non-local database URLs.
## Pagination scale seed

Create 120 clearly marked local-only pools, each with four synthetic candidates:

```powershell
npm.cmd run db:seed-pagination
```

The seed is idempotent and refuses non-local database URLs. Remove only those
synthetic pools and detached candidates later with:

```powershell
npm.cmd run db:seed-pagination:clear
```