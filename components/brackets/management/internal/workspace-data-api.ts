import { normalizeParallelBracketItem, sortBrackets } from "./presentation";
import { sortManagedPools } from "@/components/pools/shared";
import type { Pagination } from "@/lib/pagination/types";
import {
  getParallelTournament,
  getPool,
  listParallelTournamentShareLinks,
  listParallelTournaments,
  listPools,
  listTournamentInvites,
  listTournamentShareLinks,
  listTournaments,
} from "@/lib/client-api/create-workspace";
import { listTournamentMatches } from "@/lib/client-api/voting";
import type {
  BracketStageView,
  TournamentInvitesState,
  WorkspaceMatch,
  WorkspacePool,
  WorkspacePoolDetail,
  WorkspaceShareLink,
  WorkspaceTournament,
} from "./workspace-internal-types";

export const POOL_PAGE_SIZE = 24;
export const TOURNAMENT_PAGE_SIZE = 12;

export type TournamentPagination = Pagination & {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export type TournamentStatusCounts = Record<BracketStageView, number>;
export type StageCache = Partial<Record<BracketStageView, { items: WorkspaceTournament[]; pagination: TournamentPagination }>>;

export type ListResponse<T> = {
  items?: T[];
  item?: T;
  meta?: Pagination & {
    statusCounts?: Partial<Record<BracketStageView, number>>;
  };
};

type ParallelTournamentResponse = {
  item?: WorkspaceTournament & {
    participants?: WorkspaceInviteLike[];
  };
};

type WorkspaceInviteLike = TournamentInvitesState[string][number];

type WorkspaceListOptions = {
  limit?: number;
  offset?: number;
  status?: BracketStageView | null;
};

type PoolDetailOptions = {
  candidateLimit?: number | null;
  candidateOffset?: number;
};

export const getPoolForWorkspace = getPool as unknown as (poolId: string, options?: PoolDetailOptions) => Promise<{ item: WorkspacePoolDetail }>;
export const listTournamentsForWorkspace = listTournaments as unknown as (options?: WorkspaceListOptions) => Promise<ListResponse<WorkspaceTournament>>;
export const listParallelTournamentsForWorkspace = listParallelTournaments as unknown as (options?: WorkspaceListOptions) => Promise<ListResponse<WorkspaceTournament>>;
export const listTournamentMatchesForWorkspace = listTournamentMatches as unknown as (tournamentId: string) => Promise<ListResponse<WorkspaceMatch>>;
export const listTournamentInvitesForWorkspace = listTournamentInvites as unknown as (tournamentId: string) => Promise<ListResponse<WorkspaceInviteLike>>;
export const getParallelTournamentForWorkspace = getParallelTournament as unknown as (tournamentId: string) => Promise<ParallelTournamentResponse>;
export const listTournamentShareLinksForWorkspace = listTournamentShareLinks as unknown as (tournamentId: string) => Promise<ListResponse<WorkspaceShareLink>>;
export const listParallelTournamentShareLinksForWorkspace = listParallelTournamentShareLinks as unknown as (
  tournamentId: string,
) => Promise<ListResponse<WorkspaceShareLink>>;

export async function listWorkspacePools(): Promise<WorkspacePool[]> {
  const data = await listPools({ limit: POOL_PAGE_SIZE, offset: 0 });
  return sortManagedPools(data.items ?? []);
}

export function mergeWorkspaceTournaments(standardData: ListResponse<WorkspaceTournament>, parallelData: ListResponse<WorkspaceTournament>): WorkspaceTournament[] {
  return sortBrackets([
    ...(standardData.items ?? []).filter((item) => !item.parentParallelTournamentId).map((item) => ({ ...item, kind: "standard" as const })),
    ...(parallelData.items ?? []).map(normalizeParallelBracketItem),
  ]);
}

export function getWorkspaceStatusCounts(standardData: ListResponse<WorkspaceTournament>, parallelData: ListResponse<WorkspaceTournament>): TournamentStatusCounts {
  const standardCounts = standardData.meta?.statusCounts ?? {};
  const parallelCounts = parallelData.meta?.statusCounts ?? {};

  return {
    draft: Number(standardCounts.draft ?? 0) + Number(parallelCounts.draft ?? 0),
    active: Number(standardCounts.active ?? 0) + Number(parallelCounts.active ?? 0),
    complete: Number(standardCounts.complete ?? 0) + Number(parallelCounts.complete ?? 0),
  };
}

export function hasNextWorkspaceTournamentPage(standardData: ListResponse<WorkspaceTournament>, parallelData: ListResponse<WorkspaceTournament>): boolean {
  return Boolean(standardData.meta?.hasNextPage || parallelData.meta?.hasNextPage);
}
