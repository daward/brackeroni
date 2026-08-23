let parallelParticipantSupportPromise = null;

async function hasParallelParticipantSupport(sql) {
  if (!parallelParticipantSupportPromise) {
    parallelParticipantSupportPromise = (async () => {
      const [row] = await sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'parallel_tournament_participant'
        ) as "hasParallelTournamentParticipantTable"
      `;

      return Boolean(row?.hasParallelTournamentParticipantTable);
    })();
  }

  return parallelParticipantSupportPromise;
}

export async function assertTournamentAccess({
  sql,
  tournamentId,
  sharingMode,
  visibility,
  votingAccess,
  creatorUserId,
  userId,
  anonymousVoterToken = null,
  isParallelParticipantTournament = false,
  mode,
}) {
  const isCreator = creatorUserId === userId;
  const isPublic =
    visibility === "public_listed" || visibility === "public_unlisted";

  if (
    isParallelParticipantTournament &&
    (userId || anonymousVoterToken) &&
    (await hasParallelParticipantSupport(sql))
  ) {
    const participantAccess = await sql`
      select 1
      from parallel_tournament_participant
      where tournament_id = ${tournamentId}
        and (
          (${userId}::uuid is not null and user_id = ${userId}::uuid)
          or (
            ${anonymousVoterToken ?? null}::text is not null
            and anonymous_voter_token = ${anonymousVoterToken ?? null}::text
          )
        )
      limit 1
    `;

    if (participantAccess.length > 0) {
      return;
    }
  }

  if (isPublic) {
    if (mode === "read" || isCreator) {
      return;
    }

    if (!userId && !anonymousVoterToken) {
      throw new Error("UNAUTHORIZED");
    }

    return;
  }

  if (sharingMode === "private") {
    if (!isCreator) {
      throw new Error("FORBIDDEN");
    }
    return;
  }

  if (sharingMode === "with_friends") {
    if (isCreator) {
      return;
    }

    if (!userId) {
      throw new Error("UNAUTHORIZED");
    }

    const invited = await sql`
      select 1
      from tournament_invite
      where tournament_id = ${tournamentId}
        and user_id = ${userId}
      limit 1
    `;

    if (invited.length === 0) {
      throw new Error("FORBIDDEN");
    }
  }
}

export { hasParallelParticipantSupport };
