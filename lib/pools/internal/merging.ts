import { getDb } from "@/lib/db";
import { getPoolById } from "@/lib/pools/internal/access";
import { assertPoolMutable } from "@/lib/pools/internal/policy";
import type { PoolDetail } from "@/lib/pools/types";
import type { PoolSqlClient } from "@/lib/pools/internal/schema-support";

export async function mergePoolIntoPool({
  poolId,
  sourcePoolId,
  creatorUserId,
  isAdmin = false
}: {
  poolId: string;
  sourcePoolId: string;
  creatorUserId: string;
  isAdmin?: boolean;
}): Promise<PoolDetail> {
  if (poolId === sourcePoolId) {
    throw new Error("INVALID_POOL_MERGE");
  }

  const sql = getDb() as PoolSqlClient;
  const targetPool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(targetPool, isAdmin);
  await getPoolById({ poolId: sourcePoolId, userId: creatorUserId, isAdmin });

  await sql.begin(async (tx) => {
    const targetCandidates = await tx`
      select c.name
      from candidate_pool_item i
      join candidate c on c.id = i.candidate_id
      where i.pool_id = ${poolId}
    `;

    const sourceCandidates = await tx`
      select c.id, c.name
      from candidate_pool_item i
      join candidate c on c.id = i.candidate_id
      where i.pool_id = ${sourcePoolId}
      order by i.display_order nulls last, lower(c.name)
    `;

    const existingNames = new Set(
      targetCandidates.map((candidate: { name: string }) => candidate.name.trim().toLowerCase())
    );

    for (const candidate of sourceCandidates) {
      const normalizedName = candidate.name?.trim().toLowerCase();

      if (!normalizedName || existingNames.has(normalizedName)) {
        continue;
      }

      existingNames.add(normalizedName);

      await tx`
        insert into candidate_pool_item (pool_id, candidate_id)
        values (${poolId}, ${candidate.id})
        on conflict (pool_id, candidate_id) do nothing
      `;
    }

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;
  });

  return getPoolById({ poolId, userId: creatorUserId, isAdmin });
}
