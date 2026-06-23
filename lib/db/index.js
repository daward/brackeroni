import postgres from "postgres";

let sql;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: 5
    });
  }

  return sql;
}
