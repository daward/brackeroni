"use client";

import { requestJson } from "@/lib/client-api/http";

export function submitMatchVote(matchId, selectedEntryId) {
  return requestJson(`/api/matches/${matchId}/votes`, {
    method: "POST",
    body: { selectedEntryId },
    errorMessage: "Failed to record vote."
  });
}

export function getTournament(tournamentId) {
  return requestJson(`/api/tournaments/${tournamentId}`, {
    cache: "no-store",
    errorMessage: "Failed to refresh bracket."
  });
}

export function listTournamentMatches(tournamentId) {
  return requestJson(`/api/tournaments/${tournamentId}/matches`, {
    cache: "no-store",
    errorMessage: "Failed to refresh matches."
  });
}

export async function getTournamentWithMatches(tournamentId) {
  const [matchData, tournamentData] = await Promise.all([
    listTournamentMatches(tournamentId),
    getTournament(tournamentId)
  ]);

  return {
    matches: matchData.items ?? [],
    tournament: tournamentData.item
  };
}
