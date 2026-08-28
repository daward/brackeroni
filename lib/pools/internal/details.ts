import { getDb } from "@/lib/db";
import { getPoolById } from "@/lib/pools/internal/access";
import { assertPoolMutable } from "@/lib/pools/internal/policy";
import { getPoolVisibilitySupport } from "@/lib/pools/internal/schema-support";
import type { PoolDetail } from "@/lib/pools/types";
import type { PoolSqlClient } from "@/lib/pools/internal/schema-support";

type PoolUpdatePatch = Partial<Pick<PoolDetail, "name" | "description" | "visibility">> & {
  isAdmin?: boolean;
};

export async function updatePool({
  poolId,
  creatorUserId,
  patch
}: {
  poolId: string;
  creatorUserId: string;
  patch: PoolUpdatePatch;
}): Promise<PoolDetail> {
  const sql = getDb() as PoolSqlClient;
  const support = await getPoolVisibilitySupport(sql);
  const current = await getPoolById({ poolId, userId: creatorUserId, isAdmin: patch.isAdmin === true });
  assertPoolMutable(current, patch.isAdmin === true);
  const nextName = Object.hasOwn(patch, "name") ? patch.name : current.name;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : current.description ?? null;
  const nextVisibility = Object.hasOwn(patch, "visibility") ? patch.visibility : current.visibility;

  if (!support.hasVisibility && nextVisibility !== "private") {
    throw new Error("POOL_PUBLIC_REQUIRES_MIGRATION");
  }

  if (support.hasVisibility) {
    await sql`
      update candidate_pool
      set
        name = ${nextName},
        description = ${nextDescription},
        visibility = ${nextVisibility},
        published_at = case
          when ${current.visibility} = 'private' and ${nextVisibility} <> 'private' then coalesce(published_at, now())
          else published_at
        end,
        updated_at = now()
      where id = ${poolId}
    `;
  } else {
    await sql`
      update candidate_pool
      set
        name = ${nextName},
        description = ${nextDescription},
        updated_at = now()
      where id = ${poolId}
    `;
  }

  return getPoolById({ poolId, userId: creatorUserId, isAdmin: patch.isAdmin === true });
}
