import postgres from "postgres";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const PREFIX = "Scale Test Pool ";
const CANDIDATE_PREFIX = "Scale Test Candidate ";
const POOL_COUNT = 120;
const CANDIDATES_PER_POOL = 4;

function assertLocalDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const hostname = new URL(process.env.DATABASE_URL).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Pagination seeding only runs against local PostgreSQL.");
  }
}

function poolName(index) {
  return `${PREFIX}${String(index).padStart(3, "0")}`;
}

async function getCurrentLocalUser(sql) {
  const email = process.env.DEV_USER_EMAIL;
  const [user] = email
    ? await sql`
        select id
        from app_user
        where email = ${email}
        limit 1
      `
    : await sql`
        select id
        from app_user
        order by updated_at desc, created_at desc
        limit 1
      `;

  if (!user) {
    throw new Error("Open the local app once first so a local app user exists.");
  }

  return user;
}

async function clearSeedData(sql, userId) {
  const pools = await sql`
    select id
    from candidate_pool
    where creator_user_id = ${userId}
      and name like ${`${PREFIX}%`}
  `;
  const poolIds = pools.map((pool) => pool.id);

  if (poolIds.length) {
    await sql`
      delete from candidate_pool
      where id = any(${sql.array(poolIds)})
    `;
  }

  const deletedCandidates = await sql`
    delete from candidate
    where creator_user_id = ${userId}
      and name like ${`${CANDIDATE_PREFIX}%`}
      and not exists (
        select 1
        from candidate_pool_item
        where candidate_pool_item.candidate_id = candidate.id
      )
  `;

  console.log(`Removed ${poolIds.length} scale-test pools and ${deletedCandidates.count} detached scale-test candidates.`);
}

async function seedPools(sql, userId) {
  const names = Array.from({ length: POOL_COUNT }, (_, index) => poolName(index + 1));
  const existing = await sql`
    select name
    from candidate_pool
    where creator_user_id = ${userId}
      and name = any(${sql.array(names)})
  `;
  const existingNames = new Set(existing.map((pool) => pool.name));
  const missingIndexes = names
    .map((name, index) => ({ name, index: index + 1 }))
    .filter(({ name }) => !existingNames.has(name));

  await sql.begin(async (tx) => {
    for (const { name, index } of missingIndexes) {
      const [pool] = await tx`
        insert into candidate_pool (creator_user_id, name, description, visibility)
        values (
          ${userId},
          ${name},
          ${`Local pagination test pool ${index}. Safe to remove with db:seed-pagination:clear.`},
          'private'
        )
        returning id
      `;

      for (let candidateIndex = 1; candidateIndex <= CANDIDATES_PER_POOL; candidateIndex += 1) {
        const [candidate] = await tx`
          insert into candidate (creator_user_id, name, description)
          values (
            ${userId},
            ${`${CANDIDATE_PREFIX}${String(index).padStart(3, "0")} / ${candidateIndex}`},
            ${`Synthetic candidate ${candidateIndex} for pagination testing.`}
          )
          returning id
        `;

        await tx`
          insert into candidate_pool_item (pool_id, candidate_id, display_order)
          values (${pool.id}, ${candidate.id}, ${candidateIndex - 1})
        `;
      }
    }
  });

  console.log(
    `Pagination seed ready: ${existingNames.size} already existed, ${missingIndexes.length} pools added, ${missingIndexes.length * CANDIDATES_PER_POOL} candidates added.`
  );
}

async function main() {
  assertLocalDatabase();
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    const user = await getCurrentLocalUser(sql);

    if (process.argv[2] === "clear") {
      await clearSeedData(sql, user.id);
      return;
    }

    if (process.argv[2]) {
      throw new Error(`Unknown pagination seed command: ${process.argv[2]}`);
    }

    await seedPools(sql, user.id);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});