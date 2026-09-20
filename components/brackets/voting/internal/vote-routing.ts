import type { VoteTournament } from "./voting-internal-types";

export function buildCreateReturnUrl(tournamentId: string, stage = "active") {
  const params = new URLSearchParams({ stage });

  if (tournamentId) {
    params.set("tournament", tournamentId);
  }

  return `/brackets?${params.toString()}`;
}

export function buildCompletedVotingReturnUrl({
  returnTo = null,
  tournamentId,
}: {
  returnTo?: string | null;
  tournamentId: string;
}) {
  if (returnTo === "create") {
    return buildCreateReturnUrl(tournamentId, "active");
  }

  return buildVoteUrl({ returnTo });
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
