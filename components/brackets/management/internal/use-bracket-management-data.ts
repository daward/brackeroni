"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { runSingleFlight } from "@/lib/async/single-flight";
import { normalizeParallelBracketItem, sortManagedBrackets } from "@/lib/brackets/presentation";
import { sortManagedPools } from "@/lib/pools/listing";
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
  MessageSetter,
  PoolDetailsState,
  TournamentInvitesState,
  TournamentMatchesState,
  TournamentShareLinksState,
  WorkspaceMatch,
  WorkspacePool,
  WorkspacePoolDetail,
  WorkspaceTournament,
} from "./workspace-internal-types";
import { getErrorMessage } from "./workspace-internal-types";

const POOL_PAGE_SIZE = 24;
const TOURNAMENT_PAGE_SIZE = 12;

type TournamentPagination = {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

type TournamentStatusCounts = Record<BracketStageView, number>;

type StageCache = Partial<Record<BracketStageView, { items: WorkspaceTournament[]; pagination: TournamentPagination }>>;

type UseBracketManagementDataProps = {
  setErrorMessage: MessageSetter;
  tournamentStage?: BracketStageView;
};

export function useBracketManagementData({ setErrorMessage, tournamentStage = "draft" }: UseBracketManagementDataProps) {
  const [pools, setPools] = useState<WorkspacePool[]>([]);
  const [tournaments, setTournaments] = useState<WorkspaceTournament[]>([]);
  const [loadedTournamentStage, setLoadedTournamentStage] = useState<BracketStageView | null>(null);
  const [tournamentPage, setTournamentPage] = useState(1);
  const [tournamentPagination, setTournamentPagination] = useState<TournamentPagination>({ page: 1, pageSize: TOURNAMENT_PAGE_SIZE, hasNextPage: false });
  const [tournamentStatusCounts, setTournamentStatusCounts] = useState<TournamentStatusCounts>({ draft: 0, active: 0, complete: 0 });
  const [poolDetails, setPoolDetails] = useState<PoolDetailsState>({});
  const [tournamentInvites, setTournamentInvites] = useState<TournamentInvitesState>({});
  const [tournamentShareLinks, setTournamentShareLinks] = useState<TournamentShareLinksState>({});
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatchesState>({});
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();
  const poolDetailsRef = useRef<PoolDetailsState>({});
  const tournamentInvitesRef = useRef<TournamentInvitesState>({});
  const tournamentShareLinksRef = useRef<TournamentShareLinksState>({});
  const tournamentMatchesRef = useRef<TournamentMatchesState>({});
  const pendingPoolDetailIdsRef = useRef(new Set<string>());
  const pendingTournamentDetailIdsRef = useRef(new Set<string>());
  const tournamentStageCacheRef = useRef<StageCache>({});
  const workspaceLoadPromiseRef = useRef<Promise<void> | null>(null);
  const lastWorkspaceLoadRef = useRef<{ key: string | null; completedAt: number }>({ key: null, completedAt: 0 });

  useEffect(() => {
    poolDetailsRef.current = poolDetails;
  }, [poolDetails]);

  useEffect(() => {
    tournamentInvitesRef.current = tournamentInvites;
  }, [tournamentInvites]);

  useEffect(() => {
    tournamentShareLinksRef.current = tournamentShareLinks;
  }, [tournamentShareLinks]);

  useEffect(() => {
    tournamentMatchesRef.current = tournamentMatches;
  }, [tournamentMatches]);

  const removeCandidateFromWorkspace = useCallback((poolId: string, candidateId: string) => {
    setPools((current) =>
      sortManagedPools(
        current.map((pool) =>
          pool.id === poolId
            ? {
                ...pool,
                candidateCount: Math.max((pool.candidateCount || 0) - 1, 0),
              }
            : pool,
        ),
      ),
    );

    setPoolDetails((current) => {
      const pool = current[poolId];

      if (!pool) {
        return current;
      }

      return {
        ...current,
        [poolId]: {
          ...pool,
          candidateCount: Math.max((pool.candidateCount || 0) - 1, 0),
          candidates: ("candidates" in pool ? pool.candidates || [] : []).filter((entry) => entry.id !== candidateId),
        },
      };
    });
  }, []);

  const replaceCandidateInWorkspace = useCallback((poolId: string, nextCandidate: WorkspacePoolDetail["candidates"][number]) => {
    if (!poolId || !nextCandidate?.id) {
      return;
    }

    setPoolDetails((current) => {
      const pool = current[poolId];

      if (!pool) {
        return current;
      }

      return {
        ...current,
        [poolId]: {
          ...pool,
          candidates: ("candidates" in pool ? pool.candidates || [] : []).map((candidate) => (candidate.id === nextCandidate.id ? { ...candidate, ...nextCandidate } : candidate)),
        },
      };
    });
  }, []);

  const replacePoolInWorkspace = useCallback((nextPool: WorkspacePool | WorkspacePoolDetail) => {
    if (!nextPool?.id) {
      return;
    }

    setPools((current) => sortManagedPools(current.map((pool) => (pool.id === nextPool.id ? { ...pool, ...nextPool } : pool))));
    setPoolDetails((current) => ({
      ...current,
      [nextPool.id]: nextPool,
    }));
  }, []);

  const replaceTournamentInWorkspace = useCallback((tournamentId: string, nextTournament: WorkspaceTournament) => {
    tournamentStageCacheRef.current = Object.fromEntries(
      Object.entries(tournamentStageCacheRef.current).map(([stage, cached]) => [
        stage,
        {
          ...cached,
          items: sortManagedBrackets(cached.items.map((tournament) => (tournament.id === tournamentId ? nextTournament : tournament))),
        },
      ]),
    );
    setTournaments((current) => sortManagedBrackets(current.map((tournament) => (tournament.id === tournamentId ? nextTournament : tournament))));
  }, []);

  const showCachedTournamentStage = useCallback((stage: BracketStageView) => {
    const cached = tournamentStageCacheRef.current[stage];
    if (!cached) return false;
    setTournaments(cached.items);
    setTournamentPagination(cached.pagination);
    setLoadedTournamentStage(stage);
    return true;
  }, []);

  const replaceTournamentMatchInWorkspace = useCallback((tournamentId: string, nextMatch: WorkspaceMatch) => {
    if (!tournamentId || !nextMatch?.id) {
      return;
    }

    setTournamentMatches((current) => {
      const existingMatches = current[tournamentId] || [];

      if (!existingMatches.length) {
        return current;
      }

      return {
        ...current,
        [tournamentId]: existingMatches.map((match) => (match.id === nextMatch.id ? { ...match, ...nextMatch } : match)),
      };
    });
  }, []);

  const refreshTournamentMatches = useCallback(async (tournamentId: string) => {
    if (!tournamentId) {
      return [];
    }

    const data = await listTournamentMatches(tournamentId);
    const nextMatches = data.items ?? [];

    setTournamentMatches((current) => ({
      ...current,
      [tournamentId]: nextMatches,
    }));

    return nextMatches;
  }, []);

  const setTournamentShareLink = useCallback((tournamentId: string, shareLink: TournamentShareLinksState[string][number]) => {
    setTournamentShareLinks((current) => ({
      ...current,
      [tournamentId]: [shareLink],
    }));
  }, []);

  const loadFriendsTournamentMeta = useCallback(async (nextTournaments: WorkspaceTournament[]) => {
    const withFriendsTournaments = (nextTournaments ?? []).filter(
      (tournament) => tournament.sharingMode === "with_friends" && (tournament.status === "draft" || tournament.status === "active"),
    );

    const inviteEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.kind !== "parallel_parent")
        .map(async (tournament) => {
          const data = await listTournamentInvites(tournament.id);
          return [tournament.id, data.items ?? []];
        }),
    );

    const parallelEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.kind === "parallel_parent")
        .map(async (tournament) => {
          const data = await getParallelTournament(tournament.id);
          return [tournament.id, data.item?.participants ?? []];
        }),
    );

    const linkEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.status === "draft" || tournament.status === "active")
        .map(async (tournament) => {
          const data = tournament.kind === "parallel_parent" ? await listParallelTournamentShareLinks(tournament.id) : await listTournamentShareLinks(tournament.id);
          return [tournament.id, data.items ?? []];
        }),
    );

    setTournamentInvites(Object.fromEntries([...inviteEntries, ...parallelEntries]));
    setTournamentShareLinks(Object.fromEntries(linkEntries));
  }, []);

  const ensurePoolDetails = useCallback(async (poolId: string): Promise<WorkspacePoolDetail | null> => {
    if (!poolId) {
      return null;
    }

    if (poolDetailsRef.current[poolId]) {
      return poolDetailsRef.current[poolId] as WorkspacePoolDetail;
    }

    if (pendingPoolDetailIdsRef.current.has(poolId)) {
      return null;
    }

    pendingPoolDetailIdsRef.current.add(poolId);

    try {
      const data = await getPool(poolId, { candidateLimit: 24 } as any);
      setPoolDetails((current) => ({
        ...current,
        [poolId]: data.item,
      }));
      return data.item;
    } finally {
      pendingPoolDetailIdsRef.current.delete(poolId);
    }
  }, []);

  const ensurePoolInWorkspace = useCallback(
    async (poolId: string) => {
      const pool = await ensurePoolDetails(poolId);

      if (!pool) {
        return null;
      }

      setPools((current) => (current.some((item) => item.id === pool.id) ? current : sortManagedPools([...current, pool])));

      return pool;
    },
    [ensurePoolDetails],
  );
  const ensureTournamentWorkspaceDetails = useCallback(async (tournament: WorkspaceTournament) => {
    if (!tournament?.id) {
      return;
    }

    if (pendingTournamentDetailIdsRef.current.has(tournament.id)) {
      return;
    }

    const needsMatches = tournament.kind !== "parallel_parent" && tournament.status === "active" && !tournamentMatchesRef.current[tournament.id];
    const needsInvites =
      tournament.sharingMode === "with_friends" && (tournament.status === "draft" || tournament.status === "active") && !tournamentInvitesRef.current[tournament.id];
    const needsShareLinks =
      tournament.sharingMode === "with_friends" && (tournament.status === "draft" || tournament.status === "active") && !tournamentShareLinksRef.current[tournament.id];

    if (!needsMatches && !needsInvites && !needsShareLinks) {
      return;
    }

    pendingTournamentDetailIdsRef.current.add(tournament.id);

    try {
      const tasks: Array<Promise<void>> = [];

      if (needsMatches) {
        tasks.push(
          listTournamentMatches(tournament.id).then((data: any) => {
            setTournamentMatches((current) => ({
              ...current,
              [tournament.id]: data.items ?? [],
            }));
          }),
        );
      }

      if (needsInvites || needsShareLinks) {
        if (tournament.kind === "parallel_parent") {
          tasks.push(
            getParallelTournament(tournament.id).then((data: any) => {
              if (needsInvites) {
                setTournamentInvites((current) => ({
                  ...current,
                  [tournament.id]: data.item?.participants ?? [],
                }));
              }
            }),
          );
        } else if (needsInvites) {
          tasks.push(
            listTournamentInvites(tournament.id).then((data: any) => {
              setTournamentInvites((current) => ({
                ...current,
                [tournament.id]: data.items ?? [],
              }));
            }),
          );
        }

        if (needsShareLinks) {
          tasks.push(
            (tournament.kind === "parallel_parent" ? listParallelTournamentShareLinks(tournament.id) : listTournamentShareLinks(tournament.id)).then((data: any) => {
              setTournamentShareLinks((current) => ({
                ...current,
                [tournament.id]: data.items ?? [],
              }));
            }),
          );
        }
      }

      await Promise.all(tasks);
    } finally {
      pendingTournamentDetailIdsRef.current.delete(tournament.id);
    }
  }, []);

  const loadWorkspace = useCallback(
    ({ force = false }: { force?: boolean } = {}) => {
      const workspaceKey = `brackets:${tournamentStage}:${tournamentPage}`;
      const lastLoad = lastWorkspaceLoadRef.current;

      // Route transitions and React effects can ask for the exact same workspace
      // within milliseconds. Reuse that completed result; mutations pass force.
      if (!force && lastLoad.key === workspaceKey && Date.now() - lastLoad.completedAt < 1_500) {
        return Promise.resolve();
      }

      if (force) {
        tournamentStageCacheRef.current = {};
      }

      if (!force && tournamentPage === 1 && showCachedTournamentStage(tournamentStage)) {
        lastWorkspaceLoadRef.current = { key: workspaceKey, completedAt: Date.now() };
        return Promise.resolve();
      }

      return runSingleFlight(workspaceLoadPromiseRef, async () => {
        const tournamentOffset = (tournamentPage - 1) * TOURNAMENT_PAGE_SIZE;
        const [poolData, tournamentData, parallelTournamentData] = await Promise.all([
          listPools({ limit: POOL_PAGE_SIZE, offset: 0 }),
          listTournaments({ limit: TOURNAMENT_PAGE_SIZE, offset: tournamentOffset, status: tournamentStage } as any),
          listParallelTournaments({
            limit: TOURNAMENT_PAGE_SIZE,
            offset: tournamentOffset,
            status: tournamentStage,
          } as any).catch(() => ({
            items: [],
            meta: { hasNextPage: false },
          })),
        ]);
        const listedPools = sortManagedPools(poolData.items ?? []);
        setPools(listedPools);
        setPoolDetails((current) => ({
          ...Object.fromEntries(Object.entries(current).filter(([poolId]) => listedPools.some((pool) => pool.id === poolId))),
          ...Object.fromEntries(listedPools.map((pool) => [pool.id, current[pool.id] || pool])),
        }));
        setTournamentPagination({
          page: tournamentPage,
          pageSize: TOURNAMENT_PAGE_SIZE,
          hasNextPage: Boolean(tournamentData.meta?.hasNextPage || parallelTournamentData.meta?.hasNextPage),
        });
        const standardCounts = tournamentData.meta?.statusCounts ?? {};
        const parallelCounts = parallelTournamentData.meta?.statusCounts ?? {};
        setTournamentStatusCounts({
          draft: Number(standardCounts.draft ?? 0) + Number(parallelCounts.draft ?? 0),
          active: Number(standardCounts.active ?? 0) + Number(parallelCounts.active ?? 0),
          complete: Number(standardCounts.complete ?? 0) + Number(parallelCounts.complete ?? 0),
        });
        const normalizedTournaments = sortManagedBrackets([
          ...(tournamentData.items ?? []).filter((item: any) => !item.parentParallelTournamentId).map((item: any) => ({ ...item, kind: "standard" })),
          ...(parallelTournamentData.items ?? []).map(normalizeParallelBracketItem),
        ]);

        if (tournamentPage === 1) {
          tournamentStageCacheRef.current[tournamentStage] = {
            items: normalizedTournaments,
            pagination: {
              page: tournamentPage,
              pageSize: TOURNAMENT_PAGE_SIZE,
              hasNextPage: Boolean(tournamentData.meta?.hasNextPage || parallelTournamentData.meta?.hasNextPage),
            },
          };
          setTournaments(normalizedTournaments);
          setLoadedTournamentStage(tournamentStage);
          setTournamentMatches((current) =>
            Object.fromEntries(Object.entries(current).filter(([tournamentId]) => normalizedTournaments.some((tournament) => tournament.id === tournamentId))),
          );
          setTournamentInvites((current) =>
            Object.fromEntries(Object.entries(current).filter(([tournamentId]) => normalizedTournaments.some((tournament) => tournament.id === tournamentId))),
          );
          setTournamentShareLinks((current) =>
            Object.fromEntries(Object.entries(current).filter(([tournamentId]) => normalizedTournaments.some((tournament) => tournament.id === tournamentId))),
          );
        } else {
          setTournaments((current) => {
            const nextTournaments = sortManagedBrackets([...current, ...normalizedTournaments.filter((tournament) => !current.some((existing) => existing.id === tournament.id))]);
            tournamentStageCacheRef.current[tournamentStage] = {
              items: nextTournaments,
              pagination: {
                page: tournamentPage,
                pageSize: TOURNAMENT_PAGE_SIZE,
                hasNextPage: Boolean(tournamentData.meta?.hasNextPage || parallelTournamentData.meta?.hasNextPage),
              },
            };
            setLoadedTournamentStage(tournamentStage);
            return nextTournaments;
          });
        }
      }).then(() => {
        lastWorkspaceLoadRef.current = {
          key: workspaceKey,
          completedAt: Date.now(),
        };
      });
    },
    [showCachedTournamentStage, tournamentPage, tournamentStage],
  );
  useEffect(() => {
    startWorkspaceTransition(async () => {
      try {
        await loadWorkspace();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to load brackets."));
      }
    });
  }, [loadWorkspace, setErrorMessage]);

  return {
    isWorkspacePending,
    loadFriendsTournamentMeta,
    loadWorkspace,
    ensurePoolDetails,
    ensurePoolInWorkspace,
    ensureTournamentWorkspaceDetails,
    poolDetails,
    pools,
    refreshTournamentMatches,
    removeCandidateFromWorkspace,
    replaceCandidateInWorkspace,
    replacePoolInWorkspace,
    replaceTournamentMatchInWorkspace,
    replaceTournamentInWorkspace,
    showCachedTournamentStage,
    setTournamentPage,
    tournamentPage,
    tournamentPagination,
    tournamentStatusCounts,
    setTournamentShareLink,
    tournamentInvites,
    tournamentMatches,
    tournaments,
    loadedTournamentStage,
    tournamentShareLinks,
  };
}
