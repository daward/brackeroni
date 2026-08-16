import { normalizeCandidateTags } from "@/lib/candidate-tags";

/**
 * Inserts a candidate while accommodating databases that have not yet received
 * the optional source-url and tags migrations. Keeping that compatibility
 * branch here prevents the pool mutation modules from drifting apart.
 */
export async function insertPoolCandidate({ tx, candidateSupport, creatorUserId, candidate }) {
  const name = candidate.name;
  const description = candidate.description ?? null;
  const imageUrl = candidate.imageUrl ?? null;
  const sourceUrl = candidate.sourceUrl ?? null;
  const tags = normalizeCandidateTags(candidate.tags);

  if (candidateSupport.hasTags && candidateSupport.hasSourceUrl) {
    const [createdCandidate] = await tx`
      insert into candidate (creator_user_id, name, description, image_url, source_url, tags)
      values (${creatorUserId}, ${name}, ${description}, ${imageUrl}, ${sourceUrl}, ${tags})
      returning id
    `;
    return createdCandidate;
  }

  if (candidateSupport.hasTags) {
    const [createdCandidate] = await tx`
      insert into candidate (creator_user_id, name, description, image_url, tags)
      values (${creatorUserId}, ${name}, ${description}, ${imageUrl}, ${tags})
      returning id
    `;
    return createdCandidate;
  }

  if (candidateSupport.hasSourceUrl) {
    const [createdCandidate] = await tx`
      insert into candidate (creator_user_id, name, description, image_url, source_url)
      values (${creatorUserId}, ${name}, ${description}, ${imageUrl}, ${sourceUrl})
      returning id
    `;
    return createdCandidate;
  }

  const [createdCandidate] = await tx`
    insert into candidate (creator_user_id, name, description, image_url)
    values (${creatorUserId}, ${name}, ${description}, ${imageUrl})
    returning id
  `;
  return createdCandidate;
}
