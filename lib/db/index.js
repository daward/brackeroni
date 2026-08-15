import postgres from "postgres";
import { recordDbQuery } from "@/lib/diagnostics/local-db-trace";

const globalDb = globalThis;
const DEFAULT_POOL_MAX = process.env.NODE_ENV === "production" ? 5 : 1;

function poolMax() {
  const configured = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10);
  if (!Number.isFinite(configured)) {
    return DEFAULT_POOL_MAX;
  }

  return Math.min(Math.max(configured, 1), 5);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!globalDb.__brackeroniDb) {
    globalDb.__brackeroniDb = postgres(process.env.DATABASE_URL, {
      // A pool must survive Fast Refresh. A module-local client creates a new
      // pool after every server-module reload and can exhaust Postgres during
      // a long `next dev` session.
      max: poolMax(),
      idle_timeout: 10,
      max_lifetime: 60,
      debug(_connection, query, parameters) {
        recordDbQuery(query, parameters);
      }
    });
  }

  return globalDb.__brackeroniDb;
}