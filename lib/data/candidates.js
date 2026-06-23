import { getDb } from "@/lib/db";

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

export async function updateCandidate({ candidateId, creatorUserId, patch }) {
  const sql = getDb();
  const current = await getCandidateById({ candidateId, creatorUserId });
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
