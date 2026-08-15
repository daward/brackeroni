import postgres from "postgres";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

function assertLocalDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const hostname = new URL(process.env.DATABASE_URL).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Database diagnostics only run against local PostgreSQL.");
  }
}

async function main() {
  assertLocalDatabase();
  const command = process.argv[2] || "report";
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    await sql`create extension if not exists pg_stat_statements`;

    if (command === "reset") {
      await sql`select pg_stat_statements_reset()`;
      console.log("Local pg_stat_statements counters reset.");
      return;
    }

    if (command !== "report") {
      throw new Error(`Unknown diagnostics command: ${command}`);
    }

    const statements = await sql`
      select
        calls,
        round(total_exec_time::numeric, 2) as total_ms,
        round(mean_exec_time::numeric, 2) as mean_ms,
        rows,
        shared_blks_hit as shared_block_hits,
        shared_blks_read as shared_block_reads,
        temp_blks_written as temp_blocks_written,
        regexp_replace(query, '\\s+', ' ', 'g') as query
      from pg_stat_statements
      where dbid = (select oid from pg_database where datname = current_database())
      order by total_exec_time desc
      limit 30
    `;

    console.table(
      statements.map((statement) => ({
        calls: Number(statement.calls),
        totalMs: Number(statement.total_ms),
        meanMs: Number(statement.mean_ms),
        rows: Number(statement.rows),
        blockReads: Number(statement.shared_block_reads),
        tempWrites: Number(statement.temp_blocks_written),
        query: statement.query.slice(0, 180)
      }))
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});