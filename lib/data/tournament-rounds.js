import { buildInitialRound, buildSwissRound } from "@/lib/tournament/rounds";
import { parseSeedingStructure } from "@/lib/tournament/seeding-structure";

export async function createRound(tx, { tournamentId, sequenceNumber, matches, rankingTargetRank = 1 }) {
  await tx`
    select pg_advisory_xact_lock(hashtext(${tournamentId}::text), ${sequenceNumber})
  `;

  const [existingRound] = await tx`
    select
      id,
      ranking_target_rank as "rankingTargetRank"
    from tournament_round
    where tournament_id = ${tournamentId}
      and sequence_number = ${sequenceNumber}
    limit 1
  `;

  if (existingRound) {
    return existingRound;
  }

  const [round] = await tx`
    insert into tournament_round (
      tournament_id,
      sequence_number,
      ranking_target_rank,
      status,
      opened_at
    )
    values (${tournamentId}, ${sequenceNumber}, ${rankingTargetRank}, 'active', now())
    returning id, ranking_target_rank as "rankingTargetRank"
  `;

  for (const match of matches) {
    await tx`
      insert into match (
        tournament_id,
        round_id,
        left_entry_id,
        right_entry_id,
        left_slot_type,
        right_slot_type,
        status,
        winner_entry_id,
        resolution_source,
        pair_key
      )
      values (
        ${tournamentId},
        ${round.id},
        ${match.leftEntryId},
        ${match.rightEntryId},
        ${match.leftSlotType},
        ${match.rightSlotType},
        ${match.status},
        ${match.winnerEntryId},
        ${match.resolutionSource},
        ${match.pairKey}
      )
    `;
  }

  return round;
}

export async function ensureInitialRoundGenerated(tx, tournamentId) {
  const [tournament] = await tx`
    select
      result_mode as "resultMode",
      seeding_structure as "seedingStructure"
    from tournament
    where id = ${tournamentId}
    limit 1
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  const entries = await tx`
    select id, seed, coalesce(subseed, 0) as "subSeed"
    from tournament_entry
    where tournament_id = ${tournamentId}
    order by seed asc, coalesce(subseed, 0) asc
  `;

  const existingRounds = await tx`
    select id
    from tournament_round
    where tournament_id = ${tournamentId}
    limit 1
  `;

  if (existingRounds.length > 0) {
    return;
  }

  const roundMatches =
    tournament.resultMode === "fast_full_rank"
      ? buildSwissRound(entries, { roundNumber: 1, priorMatches: [] })
      : buildInitialRound(entries, parseSeedingStructure(tournament.seedingStructure));
  await createRound(tx, {
    tournamentId,
    sequenceNumber: 1,
    matches: roundMatches,
    rankingTargetRank: 1
  });
}
