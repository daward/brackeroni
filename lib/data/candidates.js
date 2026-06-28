import { getDb } from "@/lib/db";

async function assertCandidateMutable({ sql, candidateId, creatorUserId, isAdmin = false }) {
  if (isAdmin) {
    return;
  }

  const publicPoolUsage = await sql`
    select p.id
    from candidate_pool_item i
    join candidate_pool p on p.id = i.pool_id
    where i.candidate_id = ${candidateId}
      and p.creator_user_id = ${creatorUserId}
      and p.visibility in ('public_listed', 'public_unlisted')
    limit 1
  `;

  if (publicPoolUsage.length > 0) {
    throw new Error("POOL_LOCKED");
  }
}

export async function listCandidates({ creatorUserId, search }) {
  const sql = getDb();

  if (search) {
    return sql`
      select
        id,
        name,
        description,
        image_url as "imageUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from candidate
      where creator_user_id = ${creatorUserId}
        and name ilike ${`%${search}%`}
      order by lower(name), created_at desc
    `;
  }

  return sql`
    select
      id,
      name,
      description,
      image_url as "imageUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from candidate
    where creator_user_id = ${creatorUserId}
    order by lower(name), created_at desc
  `;
}

export async function createCandidate({ creatorUserId, name, description, imageUrl }) {
  const sql = getDb();

  const [candidate] = await sql`
    insert into candidate (creator_user_id, name, description, image_url)
    values (${creatorUserId}, ${name}, ${description ?? null}, ${imageUrl ?? null})
    returning
      id,
      name,
      description,
      image_url as "imageUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return candidate;
}

export async function getCandidateById({ candidateId, creatorUserId }) {
  const sql = getDb();
  const [candidate] = await sql`
    select
      id,
      creator_user_id as "creatorUserId",
      name,
      description,
      image_url as "imageUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from candidate
    where id = ${candidateId}
  `;

  if (!candidate) {
    throw new Error("NOT_FOUND");
  }

  if (candidate.creatorUserId !== creatorUserId) {
    throw new Error("FORBIDDEN");
  }

  return candidate;
}

export async function updateCandidate({ candidateId, creatorUserId, patch, isAdmin = false }) {
  const sql = getDb();
  const current = await getCandidateById({ candidateId, creatorUserId });
  await assertCandidateMutable({ sql, candidateId, creatorUserId, isAdmin });
  const nextName = Object.hasOwn(patch, "name") ? patch.name : current.name;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : current.description ?? null;
  const nextImageUrl = Object.hasOwn(patch, "imageUrl")
    ? patch.imageUrl ?? null
    : current.imageUrl ?? null;

  const [candidate] = await sql`
    update candidate
    set
      name = ${nextName},
      description = ${nextDescription},
      image_url = ${nextImageUrl},
      updated_at = now()
    where id = ${candidateId}
    returning
      id,
      name,
      description,
      image_url as "imageUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return candidate;
}
