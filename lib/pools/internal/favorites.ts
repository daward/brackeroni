import { getDb } from "@/lib/db";
import { getPoolById } from "@/lib/pools/internal/access";
import { createPool } from "@/lib/pools/internal/creation";
import { getPoolVisibilitySupport } from "@/lib/pools/internal/schema-support";
import type { PoolDetail } from "@/lib/pools/types";
import type { PoolSqlClient } from "@/lib/pools/internal/schema-support";

export async function favoritePool({
  poolId,
  creatorUserId
}: {
  poolId: string;
  creatorUserId: string;
}): Promise<PoolDetail> {
  const sql = getDb() as PoolSqlClient;
  const support = await getPoolVisibilitySupport(sql);
  const sourcePool = await getPoolById({
    poolId,
    userId: creatorUserId
  });

  if (support.hasSourcePoolId) {
    const [existingFavorite] = await sql`
      select id
      from candidate_pool
      where creator_user_id = ${creatorUserId}
        and source_pool_id = ${sourcePool.id}
        and archived_at is null
      order by updated_at desc
      limit 1
    `;

    if (existingFavorite) {
      return getPoolById({ poolId: existingFavorite.id, userId: creatorUserId });
    }
  }

  return createPool({
    creatorUserId,
    name: sourcePool.name,
    description: sourcePool.description,
    visibility: "private",
    sourcePoolId: sourcePool.id,
    candidates: sourcePool.candidates.map((candidate) => ({
      name: candidate.name,
      description: candidate.description,
      imageUrl: candidate.imageUrl,
      sourceUrl: candidate.sourceUrl,
      tags: candidate.tags
    }))
  });
}
