import { sortBrackets } from "./presentation";
import { sortManagedPools } from "@/components/pools/shared";
import type { PoolDetail } from "@/lib/pools/types";
import type {
  PoolDetailsState,
  TournamentInvitesState,
  TournamentMatchesState,
  TournamentShareLinksState,
  WorkspaceMatch,
  WorkspacePool,
  WorkspaceTournament,
} from "./workspace-internal-types";
import type { StageCache } from "./workspace-data-api";

export function removeCandidateFromPoolList(pools: WorkspacePool[], poolId: string): WorkspacePool[] {
  return sortManagedPools(
    pools.map((pool) =>
      pool.id === poolId
        ? {
            ...pool,
            candidateCount: Math.max((pool.candidateCount || 0) - 1, 0),
          }
        : pool,
    ),
  );
}

export function removeCandidateFromPoolDetails(details: PoolDetailsState, poolId: string, candidateId: string): PoolDetailsState {
  const pool = details[poolId];

  if (!pool) {
    return details;
  }

  return {
    ...details,
    [poolId]: {
      ...pool,
      candidateCount: Math.max((pool.candidateCount || 0) - 1, 0),
      candidates: ("candidates" in pool ? pool.candidates || [] : []).filter((entry) => entry.id !== candidateId),
    },
  };
}

export function replaceCandidateInPoolDetails(
  details: PoolDetailsState,
  poolId: string,
  nextCandidate: PoolDetail["candidates"][number],
): PoolDetailsState {
  const pool = details[poolId];

  if (!pool) {
    return details;
  }

  return {
    ...details,
    [poolId]: {
      ...pool,
      candidates: ("candidates" in pool ? pool.candidates || [] : []).map((candidate) => (candidate.id === nextCandidate.id ? { ...candidate, ...nextCandidate } : candidate)),
    },
  };
}

export function replacePoolInList(pools: WorkspacePool[], nextPool: WorkspacePool | PoolDetail): WorkspacePool[] {
  return sortManagedPools(pools.map((pool) => (pool.id === nextPool.id ? { ...pool, ...nextPool } : pool)));
}

export function mergePoolDetailsForList(current: PoolDetailsState, listedPools: WorkspacePool[]): PoolDetailsState {
  return {
    ...Object.fromEntries(Object.entries(current).filter(([poolId]) => listedPools.some((pool) => pool.id === poolId))),
    ...Object.fromEntries(listedPools.map((pool) => [pool.id, current[pool.id] || pool])),
  };
}

export function replaceTournamentInCache(cache: StageCache, tournamentId: string, nextTournament: WorkspaceTournament): StageCache {
  return Object.fromEntries(
    Object.entries(cache).map(([stage, cached]) => [
      stage,
      {
        ...cached,
        items: sortBrackets(cached.items.map((tournament) => (tournament.id === tournamentId ? nextTournament : tournament))),
      },
    ]),
  );
}

export function replaceTournamentInList(tournaments: WorkspaceTournament[], tournamentId: string, nextTournament: WorkspaceTournament): WorkspaceTournament[] {
  return sortBrackets(tournaments.map((tournament) => (tournament.id === tournamentId ? nextTournament : tournament)));
}

export function appendUniqueTournaments(current: WorkspaceTournament[], incoming: WorkspaceTournament[]): WorkspaceTournament[] {
  return sortBrackets([...current, ...incoming.filter((tournament) => !current.some((existing) => existing.id === tournament.id))]);
}

export function replaceTournamentMatch(matches: TournamentMatchesState, tournamentId: string, nextMatch: WorkspaceMatch): TournamentMatchesState {
  const existingMatches = matches[tournamentId] || [];

  if (!existingMatches.length) {
    return matches;
  }

  return {
    ...matches,
    [tournamentId]: existingMatches.map((match) => (match.id === nextMatch.id ? { ...match, ...nextMatch } : match)),
  };
}

export function pruneMatchesForTournaments(current: TournamentMatchesState, tournaments: WorkspaceTournament[]): TournamentMatchesState {
  return Object.fromEntries(Object.entries(current).filter(([tournamentId]) => tournaments.some((tournament) => tournament.id === tournamentId)));
}

export function pruneInvitesForTournaments(current: TournamentInvitesState, tournaments: WorkspaceTournament[]): TournamentInvitesState {
  return Object.fromEntries(Object.entries(current).filter(([tournamentId]) => tournaments.some((tournament) => tournament.id === tournamentId)));
}

export function pruneShareLinksForTournaments(current: TournamentShareLinksState, tournaments: WorkspaceTournament[]): TournamentShareLinksState {
  return Object.fromEntries(Object.entries(current).filter(([tournamentId]) => tournaments.some((tournament) => tournament.id === tournamentId)));
}
