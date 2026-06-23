import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const migrationsDir = path.join(process.cwd(), "db");

  await sql`
    create table if not exists schema_migration (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => /^\d+.*\.sql$/i.test(name))
    .sort();

  for (const file of files) {
    const alreadyApplied = await sql`
      select 1
      from schema_migration
      where version = ${file}
      limit 1
    `;

    if (alreadyApplied.length > 0) {
      continue;
    }

    const migrationSql = await fs.readFile(path.join(migrationsDir, file), "utf8");

    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql);
      await tx`
        insert into schema_migration (version)
        values (${file})
      `;
    });

    console.log(`Applied migration ${file}`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
