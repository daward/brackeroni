import { getDb } from "@/lib/db";
import { getCandidateSchemaSupport } from "@/lib/data/candidate-schema";
import { getPoolById } from "@/lib/data/pool-access";
import { insertPoolCandidate } from "@/lib/data/pool-candidate-persistence";
import { assertPoolMutable, isPublicPoolVisibility } from "@/lib/data/pool-policy";
import { getPoolVisibilitySupport } from "@/lib/data/pool-schema-support";
import { normalizeImportedCandidates } from "@/lib/data/pool-imports";

export async function createPool({
  creatorUserId,
  name,
  description,
  visibility = "private",
  candidates = [],
  sourcePoolId = null
  ,
  importSourceUrl = null,
  importSourceTitle = null
}) {
  const sql = getDb();
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

export async function favoritePool({ poolId, creatorUserId }) {
  const sql = getDb();
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

export async function archivePool({ poolId, userId, isAdmin = false }) {
  const sql = getDb();
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

export async function updatePool({ poolId, creatorUserId, patch }) {
  const sql = getDb();
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

export async function mergePoolIntoPool({ poolId, sourcePoolId, creatorUserId, isAdmin = false }) {
  if (poolId === sourcePoolId) {
    throw new Error("INVALID_POOL_MERGE");
  }

  const sql = getDb();
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
      targetCandidates.map((candidate) => candidate.name.trim().toLowerCase())
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
