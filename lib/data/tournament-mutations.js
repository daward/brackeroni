import { getDb } from "@/lib/db";
import { ensureInitialRoundGenerated } from "@/lib/data/tournament-rounds";
import { getTournamentById } from "@/lib/data/tournament-access";
import { getRoundClosureModeForAudience, isPublicTournamentVisibility } from "@/lib/data/tournament-policy";

export async function archiveTournament({ tournamentId, creatorUserId }) {
  const sql = getDb();
  await getTournamentById({ tournamentId, creatorUserId });

  await sql`
    update tournament
    set
      archived_at = coalesce(archived_at, now()),
      updated_at = now()
    where id = ${tournamentId}
  `;

  return { ok: true };
}

export async function createTournament({
  creatorUserId,
  title,
  description,
  sourcePoolId,
  sharingMode,
  visibility = "private",
  votingAccess = "signed_in_only",
  playStyle,
  resultMode,
  tieBreakMode,
  seedCandidateIds = null,
  advancementMode = "vote_winner"
}) {
  const sql = getDb();
  let poolCandidates = [];
  const effectiveVotingAccess = isPublicTournamentVisibility(visibility) ? "anyone" : votingAccess;

  if (sourcePoolId) {
    poolCandidates = await sql`
      select
        c.id,
        c.name,
        i.display_order as "displayOrder"
      from candidate_pool p
      join candidate_pool_item i on i.pool_id = p.id
      join candidate c on c.id = i.candidate_id
      where p.id = ${sourcePoolId}
        and (
          p.creator_user_id = ${creatorUserId}
          or p.visibility in ('public_listed', 'public_unlisted')
        )
      order by i.display_order nulls last, lower(c.name), c.created_at
    `;
  }

  if (Array.isArray(seedCandidateIds)) {
    const uniqueSeedCandidateIds = [...new Set(seedCandidateIds)];
    const poolCandidateIds = new Set(poolCandidates.map((candidate) => candidate.id));

    if (
      uniqueSeedCandidateIds.length !== poolCandidates.length ||
      uniqueSeedCandidateIds.some((candidateId) => !poolCandidateIds.has(candidateId))
    ) {
      throw new Error("TOURNAMENT_SEEDING_MISMATCH");
    }

    const seedIndexByCandidateId = new Map(uniqueSeedCandidateIds.map((candidateId, index) => [candidateId, index]));
    poolCandidates = [...poolCandidates].sort((left, right) => (
      seedIndexByCandidateId.get(left.id) - seedIndexByCandidateId.get(right.id)
    ));
  }

  const roundClosureMode = getRoundClosureModeForAudience({
    sharingMode,
    visibility
  });

  const tournament = await sql.begin(async (tx) => {
    const [createdTournament] = await tx`
      insert into tournament (
        creator_user_id,
        title,
        description,
        source_pool_id,
        sharing_mode,
        visibility,
        voting_access,
        play_style,
        result_mode,
        tie_break_mode,
        advancement_mode,
        round_closure_mode
      )
      values (
        ${creatorUserId},
        ${title},
        ${description ?? null},
        ${sourcePoolId},
        ${sharingMode},
        ${visibility},
        ${effectiveVotingAccess},
        ${playStyle},
        ${resultMode},
        ${tieBreakMode},
        ${advancementMode},
        ${roundClosureMode}
      )
      returning id
    `;

    for (const [index, candidate] of poolCandidates.entries()) {
      await tx`
        insert into tournament_entry (tournament_id, candidate_id, seed)
        values (${createdTournament.id}, ${candidate.id}, ${index + 1})
      `;
    }

    return createdTournament;
  });

  return getTournamentById({
    tournamentId: tournament.id,
    creatorUserId
  });
}

export async function createTournamentRerun({ tournamentId, creatorUserId }) {
  const sql = getDb();
  const sourceTournament = await getTournamentById({
    tournamentId,
    creatorUserId
  });
  const rerunVisibility = "private";
  const rerunVotingAccess = "signed_in_only";
  const rerunRoundClosureMode = getRoundClosureModeForAudience({
    sharingMode: sourceTournament.sharingMode,
    visibility: rerunVisibility
  });

  const nextTitle = sourceTournament.title.endsWith(" Rerun")
    ? sourceTournament.title
    : `${sourceTournament.title} Rerun`;

  const rerunTournament = await sql.begin(async (tx) => {
    const [createdTournament] = await tx`
      insert into tournament (
        creator_user_id,
        title,
        description,
        source_pool_id,
        sharing_mode,
        visibility,
        voting_access,
        play_style,
        result_mode,
        tie_break_mode,
        advancement_mode,
        round_closure_mode,
        status
      )
      values (
        ${creatorUserId},
        ${nextTitle},
        ${sourceTournament.description ?? null},
        ${sourceTournament.sourcePoolId},
        ${sourceTournament.sharingMode},
        ${rerunVisibility},
        ${rerunVotingAccess},
        ${sourceTournament.playStyle},
        ${sourceTournament.resultMode},
        ${sourceTournament.tieBreakMode},
        ${sourceTournament.advancementMode || "vote_winner"},
        ${rerunRoundClosureMode},
        'draft'
      )
      returning id
    `;

    for (const entry of sourceTournament.entries) {
      await tx`
        insert into tournament_entry (tournament_id, candidate_id, seed)
        values (${createdTournament.id}, ${entry.candidateId}, ${entry.seed})
      `;
    }

    return createdTournament;
  });

  return getTournamentById({
    tournamentId: rerunTournament.id,
    creatorUserId
  });
}

export async function updateTournament({ tournamentId, creatorUserId, patch }) {
  const sql = getDb();
  const current = await getTournamentById({ tournamentId, creatorUserId });
  const shouldSyncWithPool = patch.syncWithPool === true;
  const nextTitle = Object.hasOwn(patch, "title") ? patch.title : current.title;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : current.description ?? null;
  const nextSourcePoolId = Object.hasOwn(patch, "sourcePoolId")
    ? patch.sourcePoolId ?? null
    : current.sourcePoolId ?? null;
  const nextSharingMode = Object.hasOwn(patch, "sharingMode")
    ? patch.sharingMode
    : current.sharingMode;
  const nextVisibility = Object.hasOwn(patch, "visibility")
    ? patch.visibility
    : current.visibility;
  const requestedVotingAccess = Object.hasOwn(patch, "votingAccess")
    ? patch.votingAccess
    : current.votingAccess;
  const nextVotingAccess = isPublicTournamentVisibility(nextVisibility)
    ? "anyone"
    : requestedVotingAccess;
  const nextPlayStyle = Object.hasOwn(patch, "playStyle") ? patch.playStyle : current.playStyle;
  const nextResultMode = Object.hasOwn(patch, "resultMode") ? patch.resultMode : current.resultMode;
  const nextTieBreakMode = Object.hasOwn(patch, "tieBreakMode")
    ? patch.tieBreakMode
    : current.tieBreakMode;
  const nextAdvancementMode = Object.hasOwn(patch, "advancementMode")
    ? patch.advancementMode
    : current.advancementMode;
  const nextRoundClosureMode = getRoundClosureModeForAudience({
    sharingMode: nextSharingMode,
    visibility: nextVisibility
  });
  const shouldLockConfig = current.status !== "draft";
  const shouldLockPublishedTournament =
    current.status !== "draft" && isPublicTournamentVisibility(current.visibility);

  if (
    shouldLockPublishedTournament &&
    (Object.hasOwn(patch, "title") ||
      Object.hasOwn(patch, "description") ||
      Object.hasOwn(patch, "sourcePoolId") ||
      Object.hasOwn(patch, "sharingMode") ||
      Object.hasOwn(patch, "visibility") ||
      Object.hasOwn(patch, "votingAccess") ||
      Object.hasOwn(patch, "playStyle") ||
      Object.hasOwn(patch, "resultMode") ||
      Object.hasOwn(patch, "advancementMode") ||
      Object.hasOwn(patch, "tieBreakMode") ||
      patch.syncWithPool === true)
  ) {
    throw new Error("TOURNAMENT_PUBLISHED_LOCKED");
  }

  if (
    shouldLockConfig &&
    (Object.hasOwn(patch, "sourcePoolId") ||
      Object.hasOwn(patch, "sharingMode") ||
      Object.hasOwn(patch, "visibility") ||
      Object.hasOwn(patch, "votingAccess") ||
      Object.hasOwn(patch, "playStyle") ||
      Object.hasOwn(patch, "resultMode") ||
      Object.hasOwn(patch, "advancementMode") ||
      Object.hasOwn(patch, "tieBreakMode"))
  ) {
    throw new Error("TOURNAMENT_CONFIG_LOCKED");
  }

  if (shouldSyncWithPool) {
    if (current.status !== "draft") {
      throw new Error("TOURNAMENT_SEEDING_LOCKED");
    }

    let addedEntryCount = 0;

    await sql.begin(async (tx) => {
      const poolCandidates = await tx`
        select
          c.id,
          i.display_order as "displayOrder"
        from candidate_pool p
        join candidate_pool_item i on i.pool_id = p.id
        join candidate c on c.id = i.candidate_id
        where p.id = ${current.sourcePoolId}
          and (
            p.creator_user_id = ${creatorUserId}
            or p.visibility in ('public_listed', 'public_unlisted')
          )
        order by i.display_order nulls last, lower(c.name), c.created_at
      `;

      const existingEntries = await tx`
        select candidate_id as "candidateId", seed
        from tournament_entry
        where tournament_id = ${tournamentId}
        order by seed asc
      `;

      const existingCandidateIds = new Set(existingEntries.map((entry) => entry.candidateId));
      const missingCandidates = poolCandidates.filter(
        (candidate) => !existingCandidateIds.has(candidate.id)
      );
      addedEntryCount = missingCandidates.length;

      let nextSeed = existingEntries.length + 1;

      for (const candidate of missingCandidates) {
        await tx`
          insert into tournament_entry (tournament_id, candidate_id, seed)
          values (${tournamentId}, ${candidate.id}, ${nextSeed})
        `;
        nextSeed += 1;
      }

      await tx`
        update tournament
        set
          title = ${nextTitle},
          description = ${nextDescription},
          sharing_mode = ${nextSharingMode},
          visibility = ${nextVisibility},
          voting_access = ${nextVotingAccess},
          play_style = ${nextPlayStyle},
          result_mode = ${nextResultMode},
          tie_break_mode = ${nextTieBreakMode},
          advancement_mode = ${nextAdvancementMode},
          round_closure_mode = ${nextRoundClosureMode},
          updated_at = now()
        where id = ${tournamentId}
      `;
    });

    const syncedTournament = await getTournamentById({ tournamentId, creatorUserId });

    return {
      ...syncedTournament,
      syncAddedCount: addedEntryCount
    };
  }

  const shouldReplaceSource =
    Object.hasOwn(patch, "sourcePoolId") ||
    Object.hasOwn(patch, "sharingMode") ||
    Object.hasOwn(patch, "visibility") ||
    Object.hasOwn(patch, "votingAccess") ||
    Object.hasOwn(patch, "playStyle") ||
    Object.hasOwn(patch, "resultMode") ||
    Object.hasOwn(patch, "advancementMode") ||
    Object.hasOwn(patch, "tieBreakMode");

  if (shouldReplaceSource) {
    if (current.status !== "draft") {
      throw new Error("TOURNAMENT_SEEDING_LOCKED");
    }

    await sql.begin(async (tx) => {
      let nextPoolCandidates = [];

      if (nextSourcePoolId) {
        nextPoolCandidates = await tx`
          select
            c.id,
            i.display_order as "displayOrder"
          from candidate_pool p
          join candidate_pool_item i on i.pool_id = p.id
          join candidate c on c.id = i.candidate_id
          where p.id = ${nextSourcePoolId}
            and (
              p.creator_user_id = ${creatorUserId}
              or p.visibility in ('public_listed', 'public_unlisted')
            )
          order by i.display_order nulls last, lower(c.name), c.created_at
        `;
      }

      if (Object.hasOwn(patch, "sourcePoolId")) {
        await tx`
          delete from tournament_entry
          where tournament_id = ${tournamentId}
        `;

        for (const [index, candidate] of nextPoolCandidates.entries()) {
          await tx`
            insert into tournament_entry (tournament_id, candidate_id, seed)
            values (${tournamentId}, ${candidate.id}, ${index + 1})
          `;
        }
      }

      await tx`
        update tournament
        set
          title = ${nextTitle},
          description = ${nextDescription},
          source_pool_id = ${nextSourcePoolId},
          sharing_mode = ${nextSharingMode},
          visibility = ${nextVisibility},
          voting_access = ${nextVotingAccess},
          play_style = ${nextPlayStyle},
          result_mode = ${nextResultMode},
          tie_break_mode = ${nextTieBreakMode},
          advancement_mode = ${nextAdvancementMode},
          round_closure_mode = ${nextRoundClosureMode},
          updated_at = now()
        where id = ${tournamentId}
      `;
    });

    return getTournamentById({ tournamentId, creatorUserId });
  }

  if (Object.hasOwn(patch, "status")) {
    const nextStatus = patch.status;

    if (nextStatus === current.status) {
      return current;
    }

    const allowedTransitions = {
      draft: ["active"],
      active: ["complete"],
      complete: []
    };

    if (!allowedTransitions[current.status]?.includes(nextStatus)) {
      throw new Error("INVALID_TOURNAMENT_STATUS_TRANSITION");
    }

    if (nextStatus === "active") {
      await sql.begin(async (tx) => {
        await ensureInitialRoundGenerated(tx, tournamentId);

        if (nextSharingMode === "with_friends") {
          await tx`
            update tournament_invite
            set status = 'locked'
            where tournament_id = ${tournamentId}
          `;
        }

        await tx`
          update tournament
        set
          title = ${nextTitle},
          description = ${nextDescription},
          source_pool_id = ${nextSourcePoolId},
          sharing_mode = ${nextSharingMode},
          visibility = ${nextVisibility},
          voting_access = ${nextVotingAccess},
          play_style = ${nextPlayStyle},
          result_mode = ${nextResultMode},
          tie_break_mode = ${nextTieBreakMode},
          advancement_mode = ${nextAdvancementMode},
          round_closure_mode = ${nextRoundClosureMode},
          status = 'active',
          started_at = coalesce(started_at, now()),
          updated_at = now()
          where id = ${tournamentId}
        `;
      });
    } else if (nextStatus === "complete") {
      await sql.begin(async (tx) => {
        await tx`
          update tournament
          set
            title = ${nextTitle},
            description = ${nextDescription},
            source_pool_id = ${nextSourcePoolId},
            sharing_mode = ${nextSharingMode},
            visibility = ${nextVisibility},
            voting_access = ${nextVotingAccess},
            play_style = ${nextPlayStyle},
            result_mode = ${nextResultMode},
            tie_break_mode = ${nextTieBreakMode},
            advancement_mode = ${nextAdvancementMode},
            round_closure_mode = ${nextRoundClosureMode},
            status = 'complete',
            completed_at = coalesce(completed_at, now()),
            updated_at = now()
          where id = ${tournamentId}
        `;

        await tx`
          update parallel_tournament_participant
          set
            status = 'complete',
            completed_at = coalesce(completed_at, now()),
            updated_at = now()
          where tournament_id = ${tournamentId}
        `;
      });
    }
  } else {
    await sql`
      update tournament
      set
        title = ${nextTitle},
        description = ${nextDescription},
        source_pool_id = ${nextSourcePoolId},
        sharing_mode = ${nextSharingMode},
        visibility = ${nextVisibility},
        voting_access = ${nextVotingAccess},
        play_style = ${nextPlayStyle},
        result_mode = ${nextResultMode},
        tie_break_mode = ${nextTieBreakMode},
        advancement_mode = ${nextAdvancementMode},
        round_closure_mode = ${nextRoundClosureMode},
        updated_at = now()
      where id = ${tournamentId}
    `;
  }

  return getTournamentById({ tournamentId, creatorUserId });
}

export async function updateTournamentEntries({
  tournamentId,
  creatorUserId,
  entries,
  seedingStructure = {}
}) {
  const sql = getDb();
  const tournament = await getTournamentById({ tournamentId, creatorUserId });

  if (isPublicTournamentVisibility(tournament.visibility)) {
    throw new Error("TOURNAMENT_PUBLISHED_LOCKED");
  }

  if (tournament.status !== "draft") {
    throw new Error("TOURNAMENT_SEEDING_LOCKED");
  }

  const currentEntryIds = tournament.entries.map((entry) => entry.id);

  if (entries.length !== currentEntryIds.length) {
    throw new Error("INVALID_TOURNAMENT_ENTRIES");
  }

  const nextEntryIds = [...new Set(entries.map((entry) => entry.id))];

  if (nextEntryIds.length !== currentEntryIds.length) {
    throw new Error("INVALID_TOURNAMENT_ENTRIES");
  }

  const currentEntryIdSet = new Set(currentEntryIds);
  const hasUnexpectedEntry = nextEntryIds.some((entryId) => !currentEntryIdSet.has(entryId));

  if (hasUnexpectedEntry) {
    throw new Error("INVALID_TOURNAMENT_ENTRIES");
  }

  const nextEntryIdSet = new Set(nextEntryIds);
  const normalizedSubBrackets = [...(seedingStructure.subBrackets || [])]
    .filter((subBracket) => typeof subBracket?.id === "string" && subBracket.id && subBracket.id !== "__root__")
    .sort((left, right) => {
      if ((left.index ?? 0) !== (right.index ?? 0)) {
        return (left.index ?? 0) - (right.index ?? 0);
      }

      return String(left.id).localeCompare(String(right.id));
    })
    .map((subBracket, index) => ({
      id: subBracket.id,
      index,
      name:
        typeof subBracket.name === "string" && subBracket.name.length > 0
          ? subBracket.name
          : `Sub-bracket ${index + 1}`
    }));
  const subBracketIds = new Set(normalizedSubBrackets.map((subBracket) => subBracket.id));
  const normalizedEntryBrackets = Object.fromEntries(
    Object.entries(seedingStructure.entryBrackets || {}).filter(([entryId, bracketId]) => {
      return nextEntryIdSet.has(entryId) && typeof bracketId === "string" && subBracketIds.has(bracketId);
    })
  );
  const normalizedSeedingStructure = {
    subBrackets: normalizedSubBrackets,
    entryBrackets: normalizedEntryBrackets
  };

  const entryBracketById = new Map(
    Object.entries(normalizedEntryBrackets).map(([entryId, bracketId]) => [entryId, bracketId || "__root__"])
  );
  const seedBuckets = new Map();

  for (const entry of entries) {
    const normalizedSeed = Number(entry.seed);
    const normalizedSubSeed = Number(entry.subSeed || 0);
    const bracketId = entryBracketById.get(entry.id) || "__root__";

    if (!Number.isInteger(normalizedSeed) || normalizedSeed < 1) {
      throw new Error("INVALID_TOURNAMENT_ENTRIES");
    }

    if (!Number.isInteger(normalizedSubSeed) || normalizedSubSeed < 0) {
      throw new Error("INVALID_TOURNAMENT_ENTRIES");
    }

    const bucketKey = `${bracketId}:${normalizedSeed}`;
    const bucket = seedBuckets.get(bucketKey) || [];
    bucket.push(normalizedSubSeed);
    seedBuckets.set(bucketKey, bucket);
  }

  for (const [, subSeeds] of seedBuckets) {
    if (subSeeds.length > 2) {
      throw new Error("INVALID_TOURNAMENT_ENTRIES");
    }

    const uniqueSubSeeds = [...new Set(subSeeds)].sort((left, right) => left - right);
    if (uniqueSubSeeds.length !== subSeeds.length) {
      throw new Error("INVALID_TOURNAMENT_ENTRIES");
    }

    if (uniqueSubSeeds[0] !== 0) {
      throw new Error("INVALID_TOURNAMENT_ENTRIES");
    }

    if (uniqueSubSeeds.length === 2 && uniqueSubSeeds[1] !== 1) {
      throw new Error("INVALID_TOURNAMENT_ENTRIES");
    }
  }

  await sql.begin(async (tx) => {
    for (const [index, entry] of entries.entries()) {
      await tx`
        update tournament_entry
        set
          seed = ${1000 + index + 1},
          subseed = 0
        where id = ${entry.id}
          and tournament_id = ${tournamentId}
      `;
    }

    for (const entry of entries) {
      await tx`
        update tournament_entry
        set
          seed = ${entry.seed},
          subseed = ${entry.subSeed || 0}
        where id = ${entry.id}
          and tournament_id = ${tournamentId}
      `;
    }

    await tx`
      update tournament
      set updated_at = now()
      , seeding_structure = ${JSON.stringify(normalizedSeedingStructure)}::jsonb
      where id = ${tournamentId}
    `;
  });

  return getTournamentById({ tournamentId, creatorUserId });
}

