import postgres from "postgres";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    const [result] = await sql`
      select
        current_database() as database_name,
        current_user as user_name,
        version() as version
    `;

    console.log("Database connection succeeded.");
    console.log(`Database: ${result.database_name}`);
    console.log(`User: ${result.user_name}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
