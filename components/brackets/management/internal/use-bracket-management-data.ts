"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { runSingleFlight } from "@/lib/async/single-flight";
import { sortManagedPools } from "@/lib/pools/listing";
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
import {
  appendUniqueTournaments,
  mergePoolDetailsForList,
  pruneInvitesForTournaments,
  pruneMatchesForTournaments,
  pruneShareLinksForTournaments,
  removeCandidateFromPoolDetails,
  removeCandidateFromPoolList,
  replaceCandidateInPoolDetails,
  replacePoolInList,
  replaceTournamentInCache,
  replaceTournamentInList,
  replaceTournamentMatch,
} from "./workspace-data-state";
import {
  getParallelTournamentForWorkspace,
  getPoolForWorkspace,
  getWorkspaceStatusCounts,
  hasNextWorkspaceTournamentPage,
  listParallelTournamentShareLinksForWorkspace,
  listParallelTournamentsForWorkspace,
  listTournamentInvitesForWorkspace,
  listTournamentMatchesForWorkspace,
  listTournamentShareLinksForWorkspace,
  listTournamentsForWorkspace,
  listWorkspacePools,
  mergeWorkspaceTournaments,
  TOURNAMENT_PAGE_SIZE,
} from "./workspace-data-api";
import type { ListResponse, StageCache, TournamentPagination, TournamentStatusCounts } from "./workspace-data-api";

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
    setPools((current) => removeCandidateFromPoolList(current, poolId));
    setPoolDetails((current) => removeCandidateFromPoolDetails(current, poolId, candidateId));
  }, []);

  const replaceCandidateInWorkspace = useCallback((poolId: string, nextCandidate: WorkspacePoolDetail["candidates"][number]) => {
    if (!poolId || !nextCandidate?.id) {
      return;
    }

    setPoolDetails((current) => replaceCandidateInPoolDetails(current, poolId, nextCandidate));
  }, []);

  const replacePoolInWorkspace = useCallback((nextPool: WorkspacePool | WorkspacePoolDetail) => {
    if (!nextPool?.id) {
      return;
    }

    setPools((current) => replacePoolInList(current, nextPool));
    setPoolDetails((current) => ({
      ...current,
      [nextPool.id]: nextPool,
    }));
  }, []);

  const replaceTournamentInWorkspace = useCallback((tournamentId: string, nextTournament: WorkspaceTournament) => {
    tournamentStageCacheRef.current = replaceTournamentInCache(tournamentStageCacheRef.current, tournamentId, nextTournament);
    setTournaments((current) => replaceTournamentInList(current, tournamentId, nextTournament));
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

    setTournamentMatches((current) => replaceTournamentMatch(current, tournamentId, nextMatch));
  }, []);

  const refreshTournamentMatches = useCallback(async (tournamentId: string) => {
    if (!tournamentId) {
      return [];
    }

    const data = await listTournamentMatchesForWorkspace(tournamentId);
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
          const data = await listTournamentInvitesForWorkspace(tournament.id);
          return [tournament.id, data.items ?? []];
        }),
    );

    const parallelEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.kind === "parallel_parent")
        .map(async (tournament) => {
          const data = await getParallelTournamentForWorkspace(tournament.id);
          return [tournament.id, data.item?.participants ?? []];
        }),
    );

    const linkEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.status === "draft" || tournament.status === "active")
        .map(async (tournament) => {
          const data =
            tournament.kind === "parallel_parent"
              ? await listParallelTournamentShareLinksForWorkspace(tournament.id)
              : await listTournamentShareLinksForWorkspace(tournament.id);
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
      const data = await getPoolForWorkspace(poolId, { candidateLimit: 24 });
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
          listTournamentMatchesForWorkspace(tournament.id).then((data) => {
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
            getParallelTournamentForWorkspace(tournament.id).then((data) => {
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
            listTournamentInvitesForWorkspace(tournament.id).then((data) => {
              setTournamentInvites((current) => ({
                ...current,
                [tournament.id]: data.items ?? [],
              }));
            }),
          );
        }

        if (needsShareLinks) {
          tasks.push(
            (tournament.kind === "parallel_parent"
              ? listParallelTournamentShareLinksForWorkspace(tournament.id)
              : listTournamentShareLinksForWorkspace(tournament.id)
            ).then((data) => {
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
        const [listedPools, tournamentData, parallelTournamentData] = await Promise.all([
          listWorkspacePools(),
          listTournamentsForWorkspace({ limit: TOURNAMENT_PAGE_SIZE, offset: tournamentOffset, status: tournamentStage }),
          listParallelTournamentsForWorkspace({
            limit: TOURNAMENT_PAGE_SIZE,
            offset: tournamentOffset,
            status: tournamentStage,
          }).catch(
            (): ListResponse<WorkspaceTournament> => ({
              items: [],
              meta: { hasNextPage: false },
            }),
          ),
        ]);
        setPools(listedPools);
        setPoolDetails((current) => mergePoolDetailsForList(current, listedPools));
        setTournamentPagination({
          page: tournamentPage,
          pageSize: TOURNAMENT_PAGE_SIZE,
          hasNextPage: hasNextWorkspaceTournamentPage(tournamentData, parallelTournamentData),
        });
        setTournamentStatusCounts(getWorkspaceStatusCounts(tournamentData, parallelTournamentData));
        const normalizedTournaments = mergeWorkspaceTournaments(tournamentData, parallelTournamentData);

        if (tournamentPage === 1) {
          tournamentStageCacheRef.current[tournamentStage] = {
            items: normalizedTournaments,
            pagination: {
              page: tournamentPage,
              pageSize: TOURNAMENT_PAGE_SIZE,
              hasNextPage: hasNextWorkspaceTournamentPage(tournamentData, parallelTournamentData),
            },
          };
          setTournaments(normalizedTournaments);
          setLoadedTournamentStage(tournamentStage);
          setTournamentMatches((current) => pruneMatchesForTournaments(current, normalizedTournaments));
          setTournamentInvites((current) => pruneInvitesForTournaments(current, normalizedTournaments));
          setTournamentShareLinks((current) => pruneShareLinksForTournaments(current, normalizedTournaments));
        } else {
          setTournaments((current) => {
            const nextTournaments = appendUniqueTournaments(current, normalizedTournaments);
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
