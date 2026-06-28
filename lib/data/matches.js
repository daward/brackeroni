import { getDb } from "@/lib/db";
import { closeActiveRoundIfReady } from "@/lib/data/rounds";
import { ensureInitialRoundGenerated } from "@/lib/data/tournaments";

export async function listMatchesForTournament({
  tournamentId,
  creatorUserId,
  userId = null,
  anonymousVoterToken = null
}) {
  const sql = getDb();
  const typedUserId = userId ?? null;
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  const tournament = await getTournamentAccess({
    tournamentId,
    userId,
    creatorUserId,
    mode: "read"
  });

  if (tournament.status === "active") {
    await sql.begin(async (tx) => {
      await ensureInitialRoundGenerated(tx, tournamentId);
    });
  }

  const matches = await sql`
    select
      m.id,
      m.status,
      m.resolution_source as "resolutionSource",
      m.winner_entry_id as "winnerEntryId",
      r.id as "roundId",
      r.sequence_number as "roundNumber",
      r.ranking_target_rank as "rankingTargetRank",
      dense_rank() over (
        partition by r.ranking_target_rank
        order by r.sequence_number asc
      ) as "rankingRoundNumber",
      left_entry.id as "leftEntryId",
      left_entry.seed as "leftSeed",
      left_candidate.name as "leftName",
      left_candidate.description as "leftDescription",
      left_candidate.image_url as "leftImageUrl",
      coalesce(left_votes."voteCount", 0)::integer as "leftVoteCount",
      right_entry.id as "rightEntryId",
      right_entry.seed as "rightSeed",
      right_candidate.name as "rightName",
      right_candidate.description as "rightDescription",
      right_candidate.image_url as "rightImageUrl",
      coalesce(right_votes."voteCount", 0)::integer as "rightVoteCount",
      user_vote.selected_entry_id as "userVoteEntryId"
    from match m
    join tournament_round r on r.id = m.round_id
    left join tournament_entry left_entry on left_entry.id = m.left_entry_id
    left join candidate left_candidate on left_candidate.id = left_entry.candidate_id
    left join lateral (
      select count(*)::integer as "voteCount"
      from vote v
      where v.match_id = m.id
        and v.selected_entry_id = m.left_entry_id
    ) left_votes on true
    left join tournament_entry right_entry on right_entry.id = m.right_entry_id
    left join candidate right_candidate on right_candidate.id = right_entry.candidate_id
    left join lateral (
      select count(*)::integer as "voteCount"
      from vote v
      where v.match_id = m.id
        and v.selected_entry_id = m.right_entry_id
    ) right_votes on true
    left join vote user_vote
      on user_vote.match_id = m.id
     and (
       (${typedUserId}::uuid is not null and user_vote.user_id = ${typedUserId}::uuid)
       or (
         ${typedAnonymousVoterToken}::text is not null
         and user_vote.anonymous_voter_token = ${typedAnonymousVoterToken}::text
       )
     )
    where m.tournament_id = ${tournamentId}
    order by
      r.sequence_number asc,
      case when m.right_entry_id is null then 1 else 0 end asc,
      left_entry.seed asc nulls last,
      right_entry.seed desc nulls last,
      m.created_at asc
  `;

  return {
    tournament,
    matches: matches.map((match) => {
      const shouldHideOpenTallies =
        match.status === "open" && tournament.sharingMode !== "private";

      return {
        ...match,
        leftVoteCount: shouldHideOpenTallies ? null : match.leftVoteCount,
        rightVoteCount: shouldHideOpenTallies ? null : match.rightVoteCount
      };
    })
  };
}

export async function submitVote({
  matchId,
  userId = null,
  anonymousVoterToken = null,
  selectedEntryId
}) {
  const sql = getDb();
  const typedUserId = userId ?? null;
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  return sql.begin(async (tx) => {
    const [match] = await tx`
      select
        m.id,
        m.status,
        m.round_id as "roundId",
        m.left_entry_id as "leftEntryId",
        m.right_entry_id as "rightEntryId",
        m.tournament_id as "tournamentId",
        t.creator_user_id as "creatorUserId",
        t.sharing_mode as "sharingMode",
        t.visibility,
        t.voting_access as "votingAccess",
        t.play_style as "playStyle",
        t.result_mode as "resultMode",
        t.tie_break_mode as "tieBreakMode",
        t.round_closure_mode as "roundClosureMode",
        t.status as "tournamentStatus"
      from match m
      join tournament t on t.id = m.tournament_id
      where m.id = ${matchId}
    `;

    if (!match) {
      throw new Error("NOT_FOUND");
    }

    if (match.status !== "open") {
      throw new Error("MATCH_NOT_OPEN");
    }

    if (selectedEntryId !== match.leftEntryId && selectedEntryId !== match.rightEntryId) {
      throw new Error("INVALID_MATCH_SELECTION");
    }

    await assertVotingAccess({
      sql: tx,
      tournamentId: match.tournamentId,
      sharingMode: match.sharingMode,
      visibility: match.visibility,
      votingAccess: match.votingAccess,
      creatorUserId: match.creatorUserId,
      userId,
      anonymousVoterToken,
      mode: "vote"
    });

    const existing = await tx`
      select id
      from vote
      where match_id = ${matchId}
        and (
          (${typedUserId}::uuid is not null and user_id = ${typedUserId}::uuid)
          or (
            ${typedAnonymousVoterToken}::text is not null
            and anonymous_voter_token = ${typedAnonymousVoterToken}::text
          )
        )
      limit 1
    `;

    if (existing.length > 0) {
      throw new Error("ALREADY_VOTED");
    }

    await tx`
      insert into vote (match_id, user_id, anonymous_voter_token, selected_entry_id)
      values (${matchId}, ${typedUserId}::uuid, ${typedAnonymousVoterToken}::text, ${selectedEntryId})
    `;

    await tx`
      update tournament
      set
        last_vote_at = now(),
        updated_at = now()
      where id = ${match.tournamentId}
    `;

    if (match.tournamentStatus === "active" && match.roundClosureMode !== "manual") {
      await closeActiveRoundIfReady(tx, {
        tournamentId: match.tournamentId,
        roundId: match.roundId,
        sharingMode: match.sharingMode,
        playStyle: match.playStyle,
        resultMode: match.resultMode,
        tieBreakMode: match.tieBreakMode,
        roundClosureMode: match.roundClosureMode
      });
    }

    return {
      matchId,
      selectedEntryId
    };
  });
}

export async function getTournamentAccess({
  tournamentId,
  userId = null,
  creatorUserId,
  mode = "read"
}) {
  const sql = getDb();
  const [tournament] = await sql`
    select
      id,
      title,
      sharing_mode as "sharingMode",
      visibility,
      voting_access as "votingAccess",
      round_closure_mode as "roundClosureMode",
      status,
      creator_user_id as "creatorUserId"
    from tournament
    where id = ${tournamentId}
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  await assertVotingAccess({
    sql,
    tournamentId,
    sharingMode: tournament.sharingMode,
    visibility: tournament.visibility,
    votingAccess: tournament.votingAccess,
    creatorUserId: creatorUserId ?? tournament.creatorUserId,
    userId,
    mode
  });

  return tournament;
}

async function assertVotingAccess({
  sql,
  tournamentId,
  sharingMode,
  visibility,
  votingAccess,
  creatorUserId,
  userId,
  anonymousVoterToken = null,
  mode
}) {
  const isCreator = creatorUserId === userId;
  const isPublic = visibility === "public_listed" || visibility === "public_unlisted";

  if (isPublic) {
    if (mode === "read") {
      return;
    }

    if (isCreator) {
      return;
    }

    if (votingAccess === "signed_in_only") {
      if (!userId) {
        throw new Error("UNAUTHORIZED");
      }

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
