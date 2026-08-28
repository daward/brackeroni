import { getDb } from "@/lib/db";
import { getPoolById } from "@/lib/pools/internal/access";
import { assertPoolMutable } from "@/lib/pools/internal/policy";
import type { PoolMutationOk } from "@/lib/pools/types";
import type { PoolSqlClient } from "@/lib/pools/internal/schema-support";

export async function archivePool({
  poolId,
  userId,
  isAdmin = false
}: {
  poolId: string;
  userId: string;
  isAdmin?: boolean;
}): Promise<PoolMutationOk> {
  const sql = getDb() as PoolSqlClient;
  const pool = await getPoolById({ poolId, userId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  await sql`
    update candidate_pool
    set
      archived_at = coalesce(archived_at, now()),
      updated_at = now()
    where id = ${poolId}
  `;

  return { ok: true };
}
