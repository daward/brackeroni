import { getDb } from "@/lib/db";
import { getCandidateSchemaSupport } from "@/lib/shared-data/candidate-schema";
import { getPoolById } from "@/lib/pools/internal/access";
import { insertPoolCandidate } from "@/lib/pools/internal/candidate-persistence";
import { isPublicPoolVisibility } from "@/lib/pools/internal/policy";
import { getPoolVisibilitySupport } from "@/lib/pools/internal/schema-support";
import { normalizeImportedCandidates } from "@/lib/pools/internal/imports";
import type { PoolCandidateInput, PoolDetail, PoolVisibility } from "@/lib/pools/types";
import type { PoolSqlClient } from "@/lib/pools/internal/schema-support";

export async function createPool({
  creatorUserId,
  name,
  description,
  visibility = "private",
  candidates = [],
  sourcePoolId = null,
  importSourceUrl = null,
  importSourceTitle = null
}: {
  creatorUserId: string;
  name: string;
  description?: string | null;
  visibility?: PoolVisibility;
  candidates?: Partial<PoolCandidateInput>[];
  sourcePoolId?: string | null;
  importSourceUrl?: string | null;
  importSourceTitle?: string | null;
}): Promise<PoolDetail> {
  const sql = getDb() as PoolSqlClient;
  const support = await getPoolVisibilitySupport(sql);
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const uniqueCandidates = normalizeImportedCandidates(candidates);

  const pool = await sql.begin(async (tx) => {
    if (!support.hasVisibility && visibility !== "private") {
      throw new Error("POOL_PUBLIC_REQUIRES_MIGRATION");
    }

    const [createdPool] = support.hasVisibility && support.hasSourcePoolId
      ? await tx`
          insert into candidate_pool (
            creator_user_id,
            name,
            description,
            visibility,
            published_at,
            source_pool_id,
            import_source_url,
            import_source_title
          )
          values (
            ${creatorUserId},
            ${name},
            ${description ?? null},
            ${visibility},
            ${isPublicPoolVisibility(visibility) ? tx`now()` : null},
            ${sourcePoolId},
            ${support.hasImportSourceUrl ? importSourceUrl : null},
            ${support.hasImportSourceTitle ? importSourceTitle : null}
          )
          returning
            id,
            name,
            description,
            archived_at as "archivedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `
      : support.hasVisibility
        ? await tx`
            insert into candidate_pool (
              creator_user_id,
              name,
              description,
              visibility,
              published_at,
              import_source_url,
              import_source_title
            )
            values (
              ${creatorUserId},
              ${name},
              ${description ?? null},
              ${visibility},
              ${isPublicPoolVisibility(visibility) ? tx`now()` : null},
              ${support.hasImportSourceUrl ? importSourceUrl : null},
              ${support.hasImportSourceTitle ? importSourceTitle : null}
            )
            returning
              id,
              name,
              description,
              archived_at as "archivedAt",
              created_at as "createdAt",
              updated_at as "updatedAt"
          `
      : await tx`
          insert into candidate_pool (creator_user_id, name, description)
          values (${creatorUserId}, ${name}, ${description ?? null})
          returning
            id,
            name,
            description,
            archived_at as "archivedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `;

    for (const [index, candidate] of uniqueCandidates.entries()) {
      const createdCandidate = await insertPoolCandidate({
        tx,
        candidateSupport,
        creatorUserId,
        candidate
      });

      await tx`
        insert into candidate_pool_item (pool_id, candidate_id, display_order)
        values (${createdPool.id}, ${createdCandidate.id}, ${index})
      `;
    }

    return createdPool;
  });

  return getPoolById({ poolId: pool.id, userId: creatorUserId });
}
