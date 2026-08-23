import { getDb } from "@/lib/db";
import { assertTournamentAccess } from "@/lib/services/tournament-access";
import { advanceTournamentRound } from "@/lib/services/tournament-round-progression";

export async function recordTournamentVote({
  matchId,
  userId = null,
  anonymousVoterToken = null,
  selectedEntryId,
}) {
  const sql = getDb();
  const typedUserId = userId ?? null;
  const typedAnonymousVoterToken = typedUserId
    ? null
    : (anonymousVoterToken ?? null);

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
        t.advancement_mode as "advancementMode",
        t.play_style as "playStyle",
        t.result_mode as "resultMode",
        t.tie_break_mode as "tieBreakMode",
        t.round_closure_mode as "roundClosureMode",
        t.parent_parallel_tournament_id as "parentParallelTournamentId",
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

    if (
      selectedEntryId !== match.leftEntryId &&
      selectedEntryId !== match.rightEntryId
    ) {
      throw new Error("INVALID_MATCH_SELECTION");
    }

    await assertTournamentAccess({
      sql: tx,
      tournamentId: match.tournamentId,
      sharingMode: match.sharingMode,
      visibility: match.visibility,
      votingAccess: match.votingAccess,
      creatorUserId: match.creatorUserId,
      userId,
      anonymousVoterToken,
      isParallelParticipantTournament: Boolean(
        match.parentParallelTournamentId,
      ),
      mode: "vote",
    });

    const existing = await tx`
      select
        id,
        user_id as "userId",
        anonymous_voter_token as "anonymousVoterToken",
        selected_entry_id as "selectedEntryId"
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

    if (existing.some((vote) => vote.userId)) {
      throw new Error("ALREADY_VOTED");
    }

    const existingAnonymousVote = existing.find(
      (vote) =>
        vote.anonymousVoterToken &&
        typedAnonymousVoterToken &&
        vote.anonymousVoterToken === typedAnonymousVoterToken,
    );

    if (existingAnonymousVote) {
      if (!typedUserId) {
        throw new Error("ALREADY_VOTED");
      }

      await tx`
        update vote
        set
          user_id = ${typedUserId}::uuid,
          anonymous_voter_token = null
        where id = ${existingAnonymousVote.id}
      `;

      return {
        matchId,
        tournamentId: match.tournamentId,
        tournamentStatus: match.tournamentStatus,
        selectedEntryId: existingAnonymousVote.selectedEntryId,
        migratedAnonymousVote: true,
      };
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

    if (
      match.tournamentStatus === "active" &&
      match.roundClosureMode !== "manual"
    ) {
      await advanceTournamentRound(tx, {
        tournamentId: match.tournamentId,
        roundId: match.roundId,
        sharingMode: match.sharingMode,
        playStyle: match.playStyle,
        resultMode: match.resultMode,
        tieBreakMode: match.tieBreakMode,
        advancementMode: match.advancementMode,
        roundClosureMode: match.roundClosureMode,
      });
    }

    const [tournamentState] = await tx`
      select status
      from tournament
      where id = ${match.tournamentId}
      limit 1
    `;

    return {
      matchId,
      tournamentId: match.tournamentId,
      tournamentStatus: tournamentState?.status ?? match.tournamentStatus,
      selectedEntryId,
    };
  });
}

export async function closeTournamentRound({ tournamentId, creatorUserId }) {
  const sql = getDb();

  return sql.begin(async (tx) => {
    const [tournament] = await tx`
      select
        id,
        creator_user_id as "creatorUserId",
        sharing_mode as "sharingMode",
        play_style as "playStyle",
        result_mode as "resultMode",
        tie_break_mode as "tieBreakMode",
        advancement_mode as "advancementMode",
        round_closure_mode as "roundClosureMode",
        visibility,
        status
      from tournament
      where id = ${tournamentId}
    `;

    if (!tournament) {
      throw new Error("NOT_FOUND");
    }

    if (tournament.creatorUserId !== creatorUserId) {
      throw new Error("FORBIDDEN");
    }

    if (tournament.status !== "active") {
      throw new Error("ROUND_NOT_CLOSABLE");
    }

    const [activeRound] = await tx`
      select id
      from tournament_round
      where tournament_id = ${tournamentId}
        and status = 'active'
      order by sequence_number desc
      limit 1
    `;

    if (!activeRound) {
      throw new Error("ROUND_NOT_CLOSABLE");
    }

    const result = await advanceTournamentRound(tx, {
      tournamentId,
      roundId: activeRound.id,
      sharingMode: tournament.sharingMode,
      playStyle: tournament.playStyle,
      resultMode: tournament.resultMode,
      tieBreakMode: tournament.tieBreakMode,
      roundClosureMode: tournament.roundClosureMode,
      advancementMode: tournament.advancementMode,
      force: true,
      deferAdvancement:
        tournament.visibility === "public_listed" ||
        tournament.visibility === "public_unlisted",
    });

    if (!result.advanced && !result.closed) {
      throw new Error(
        result.missingManualWinners
          ? "ROUND_RESULTS_INCOMPLETE"
          : "ROUND_NOT_READY",
      );
    }

    return result;
  });
}

export async function openTournamentRound({ tournamentId, creatorUserId }) {
  const sql = getDb();

  return sql.begin(async (tx) => {
    const [tournament] = await tx`
      select
        id,
        creator_user_id as "creatorUserId",
        sharing_mode as "sharingMode",
        visibility,
        play_style as "playStyle",
        result_mode as "resultMode",
        tie_break_mode as "tieBreakMode",
        advancement_mode as "advancementMode",
        round_closure_mode as "roundClosureMode",
        status
      from tournament
      where id = ${tournamentId}
    `;

    if (!tournament) {
      throw new Error("NOT_FOUND");
    }

    if (tournament.creatorUserId !== creatorUserId) {
      throw new Error("FORBIDDEN");
    }

    if (
      !["public_listed", "public_unlisted"].includes(tournament.visibility) ||
      tournament.status !== "active"
    ) {
      throw new Error("ROUND_NOT_REVEALABLE");
    }

    const [closedRound] = await tx`
      select id
      from tournament_round
      where tournament_id = ${tournamentId}
        and status = 'closed'
        and revealed_at is null
      order by sequence_number desc
      limit 1
    `;

    if (!closedRound) {
      throw new Error("ROUND_NOT_REVEALABLE");
    }

    const result = await advanceTournamentRound(tx, {
      tournamentId,
      roundId: closedRound.id,
      sharingMode: tournament.sharingMode,
      playStyle: tournament.playStyle,
      resultMode: tournament.resultMode,
      tieBreakMode: tournament.tieBreakMode,
      roundClosureMode: tournament.roundClosureMode,
      advancementMode: tournament.advancementMode,
      force: true,
      advanceClosedRound: true,
    });

    if (!result.advanced) {
      throw new Error("ROUND_NOT_READY");
    }

    const [round] = await tx`
      update tournament_round
      set
        revealed_at = coalesce(revealed_at, now()),
        updated_at = now()
      where id = ${closedRound.id}
      returning
        id,
        tournament_id as "tournamentId",
        sequence_number::integer as "roundNumber",
        status,
        opened_at as "openedAt",
        closed_at as "closedAt",
        revealed_at as "revealedAt"
    `;

    return { ...result, round };
  });
}

export async function applyTournamentLifecyclePatch({
  tournamentId,
  creatorUserId,
  patch,
}) {
  if (patch.closeCurrentRound === true) {
    await closeTournamentRound({ tournamentId, creatorUserId });
  }

  if (patch.openNextRound === true) {
    await openTournamentRound({ tournamentId, creatorUserId });
  }
}
