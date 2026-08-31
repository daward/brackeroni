import type { VoteTournament } from "./voting-internal-types";

export function buildCreateReturnUrl(_tournamentId: string, stage = "active") {
  return `/brackets?stage=${stage}`;
}

export function buildResultsUrl(tournamentOrId: VoteTournament | string) {
  if (typeof tournamentOrId === "string") {
    return `/results/${tournamentOrId}`;
  }

  return `/results/${tournamentOrId.parentParallelTournamentId || tournamentOrId.id}`;
}

export function buildVoteUrl({
  tournamentId = null,
  returnTo = null,
}: {
  tournamentId?: string | null;
  returnTo?: string | null;
}) {
  const params = new URLSearchParams();

  if (tournamentId) {
    params.set("bracket", tournamentId);
  }

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return query ? `/vote?${query}` : "/vote";
}
