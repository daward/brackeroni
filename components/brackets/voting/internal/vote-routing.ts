import type { VoteTournament } from "./voting-internal-types";

export function buildCreateReturnUrl(_tournamentId: string, stage = "active") {
  return `/brackets?stage=${stage}`;
}

export function buildResultsUrl(tournamentOrId: VoteTournament | string) {
  if (typeof tournamentOrId === "string") {
    return `/results/${tournamentOrId}`;
  }

  return `/results/${tournamentOrId.viewerTournamentId || tournamentOrId.id}`;
}

export function buildVoteUrl({
  tournamentId = null,
  matchId = null,
  openVote = false,
  returnTo = null,
}: {
  tournamentId?: string | null;
  matchId?: string | null;
  openVote?: boolean;
  returnTo?: string | null;
}) {
  const params = new URLSearchParams();

  if (tournamentId) {
    params.set("bracket", tournamentId);
  }

  if (matchId) {
    params.set("match", matchId);
  }

  if (openVote) {
    params.set("vote", "1");
  }

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return query ? `/vote?${query}` : "/vote";
}
