import { getDb } from "@/lib/db";
import { normalizeCandidateTags } from "@/lib/candidate-tags";
import { getCandidateSchemaSupport } from "@/lib/shared-data/candidate-schema";
import { getPoolById } from "@/lib/pools/internal/access";
import { insertPoolCandidate } from "@/lib/pools/internal/candidate-persistence";
import { assertPoolMutable } from "@/lib/pools/internal/policy";
import { resolveCandidateSourceUrl } from "@/lib/source-url";
import type { PoolCandidateInput, PoolDetail } from "@/lib/pools/types";
import type { PoolSqlClient } from "@/lib/pools/internal/schema-support";

type ImportedCandidateInput = Partial<PoolCandidateInput>;

export function normalizeImportedCandidates(candidates: ImportedCandidateInput[]): PoolCandidateInput[] {
  const uniqueCandidates: PoolCandidateInput[] = [];
  const seenLabels = new Set<string>();

  for (const candidate of candidates) {
    const nameValue = candidate.name?.trim();

    if (!nameValue) {
      continue;
    }

    const dedupeKey = nameValue.toLowerCase();

    if (seenLabels.has(dedupeKey)) {
      continue;
    }

    seenLabels.add(dedupeKey);
    uniqueCandidates.push({
      name: nameValue,
      description: candidate.description?.trim() || null,
      imageUrl: candidate.imageUrl?.trim() || null,
      sourceUrl: resolveCandidateSourceUrl(candidate.sourceUrl),
      tags: normalizeCandidateTags(candidate.tags)
    });
  }

  return uniqueCandidates;
}

export async function importCandidatesIntoPool({
  poolId,
  creatorUserId,
  candidates,
  isAdmin = false
}: {
  poolId: string;
  creatorUserId: string;
  candidates: ImportedCandidateInput[];
  isAdmin?: boolean;
}): Promise<{
  pool: PoolDetail;
  importedCount: number;
  skippedCount: number;
  importedNames: string[];
  skippedNames: string[];
}> {
  const sql = getDb() as PoolSqlClient;
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  const normalizedCandidates = normalizeImportedCandidates(candidates);

  const result = await sql.begin(async (tx) => {
    const existingCandidates = await tx`
      select c.name
      from candidate_pool_item i
      join candidate c on c.id = i.candidate_id
      where i.pool_id = ${poolId}
    `;

    const existingNames = new Set(
      existingCandidates
        .map((candidate: { name?: string | null }) => candidate.name?.trim().toLowerCase())
        .filter(Boolean)
    );

    const [nextOrderRow] = await tx`
      select coalesce(max(display_order), -1)::integer + 1 as "nextDisplayOrder"
      from candidate_pool_item
      where pool_id = ${poolId}
    `;

    let displayOrder = nextOrderRow?.nextDisplayOrder ?? 0;
    let importedCount = 0;
    let skippedCount = 0;
    const importedNames: string[] = [];
    const skippedNames: string[] = [];

    for (const candidate of normalizedCandidates) {
      const dedupeKey = candidate.name.toLowerCase();

      if (existingNames.has(dedupeKey)) {
        skippedCount += 1;
        skippedNames.push(candidate.name);
        continue;
      }

      existingNames.add(dedupeKey);

      const createdCandidate = await insertPoolCandidate({
        tx,
        candidateSupport,
        creatorUserId,
        candidate
      });

      await tx`
        insert into candidate_pool_item (pool_id, candidate_id, display_order)
        values (${poolId}, ${createdCandidate.id}, ${displayOrder})
      `;

      displayOrder += 1;
      importedCount += 1;
      importedNames.push(candidate.name);
    }

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;

    return {
      importedCount,
      skippedCount,
      importedNames,
      skippedNames
    };
  });

  const updatedPool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });

  return {
    pool: updatedPool,
    importedCount: result.importedCount,
    skippedCount: result.skippedCount,
    importedNames: result.importedNames,
    skippedNames: result.skippedNames
  };
}
