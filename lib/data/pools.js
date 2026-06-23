import { getDb } from "@/lib/db";

export async function listPools({ creatorUserId }) {
  const sql = getDb();

  return sql`
    select
      p.id,
      p.name,
      p.description,
      p.archived_at as "archivedAt",
      p.created_at as "createdAt",
      p.updated_at as "updatedAt",
      count(i.id)::integer as "candidateCount"
    from candidate_pool p
    left join candidate_pool_item i on i.pool_id = p.id
    where p.creator_user_id = ${creatorUserId}
      and p.archived_at is null
    group by p.id
    order by lower(p.name), p.created_at desc
  `;
}

export async function createPool({ creatorUserId, name, description }) {
  const sql = getDb();

  const [pool] = await sql`
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

  return { ...pool, candidateCount: 0 };
}

export async function getPoolById({ poolId, creatorUserId }) {
  const sql = getDb();
  const [pool] = await sql`
    select
      p.id,
      p.creator_user_id as "creatorUserId",
      p.name,
      p.description,
      p.archived_at as "archivedAt",
      p.created_at as "createdAt",
      p.updated_at as "updatedAt",
      count(i.id)::integer as "candidateCount"
    from candidate_pool p
    left join candidate_pool_item i on i.pool_id = p.id
    where p.id = ${poolId}
    group by p.id
  `;

  if (!pool) {
    throw new Error("NOT_FOUND");
  }

  if (pool.creatorUserId !== creatorUserId) {
    throw new Error("FORBIDDEN");
  }

  const candidates = await sql`
    select
      c.id,
      c.name,
      c.description,
      c.image_url as "imageUrl",
      i.display_order as "displayOrder"
    from candidate_pool_item i
    join candidate c on c.id = i.candidate_id
    where i.pool_id = ${poolId}
    order by i.display_order nulls last, lower(c.name)
  `;

  return {
    id: pool.id,
    name: pool.name,
    description: pool.description,
    archivedAt: pool.archivedAt,
    candidateCount: pool.candidateCount,
    createdAt: pool.createdAt,
    updatedAt: pool.updatedAt,
    candidates
  };
}

export async function archivePool({ poolId, creatorUserId }) {
  const sql = getDb();
  await getPoolById({ poolId, creatorUserId });

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
  const current = await getPoolById({ poolId, creatorUserId });
  const nextName = Object.hasOwn(patch, "name") ? patch.name : current.name;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : current.description ?? null;

  await sql`
    update candidate_pool
    set
      name = ${nextName},
      description = ${nextDescription},
      updated_at = now()
    where id = ${poolId}
  `;

  return getPoolById({ poolId, creatorUserId });
}

export async function addCandidatesToPool({ poolId, creatorUserId, candidateIds }) {
  const sql = getDb();
  await getPoolById({ poolId, creatorUserId });
  const uniqueCandidateIds = [...new Set(candidateIds)];

  const ownedCandidates = await sql`
    select id
    from candidate
    where creator_user_id = ${creatorUserId}
      and id in ${sql(uniqueCandidateIds)}
  `;

  if (ownedCandidates.length !== uniqueCandidateIds.length) {
    throw new Error("FORBIDDEN");
  }

  await sql.begin(async (tx) => {
    for (const candidateId of uniqueCandidateIds) {
      await tx`
        insert into candidate_pool_item (pool_id, candidate_id)
        values (${poolId}, ${candidateId})
        on conflict (pool_id, candidate_id) do nothing
      `;
    }

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;
  });

  return getPoolById({ poolId, creatorUserId });
}
