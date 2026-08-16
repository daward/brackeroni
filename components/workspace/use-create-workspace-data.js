"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { runSingleFlight } from "@/lib/async/single-flight";
import {
  normalizeParallelBracketItem,
  sortManagedBrackets
} from "@/components/brackets/shared/bracket-presentation";
import { sortManagedPools } from "@/components/pools/shared/pool-listing";
import {
  getParallelTournament,
  getPool,
  listParallelTournamentShareLinks,
  listParallelTournaments,
  listPools,
  listTournamentInvites,
  listTournamentShareLinks,
  listTournaments
} from "@/lib/client-api/create-workspace";
import { listTournamentMatches } from "@/lib/client-api/voting";

const POOL_PAGE_SIZE = 24;
const TOURNAMENT_PAGE_SIZE = 12;

export function useCreateWorkspaceData({ setErrorMessage, setExpandedPoolId, workspaceView, tournamentStage = "draft", initialPool = null }) {
  const [pools, setPools] = useState(() => (initialPool ? [initialPool] : []));
  const [poolPage, setPoolPage] = useState(1);
  const [poolPagination, setPoolPagination] = useState({
    page: 1,
    pageSize: POOL_PAGE_SIZE,
    totalCount: 0,
    hasNextPage: false
  });
  const [tournaments, setTournaments] = useState([]);
  const [tournamentPage, setTournamentPage] = useState(1);
  const [tournamentPagination, setTournamentPagination] = useState({ page: 1, pageSize: TOURNAMENT_PAGE_SIZE, hasNextPage: false });
  const [tournamentStatusCounts, setTournamentStatusCounts] = useState({ draft: 0, active: 0, complete: 0 });
  const [poolDetails, setPoolDetails] = useState(() =>
    initialPool?.id ? { [initialPool.id]: initialPool } : {}
  );
  const [tournamentInvites, setTournamentInvites] = useState({});
  const [tournamentShareLinks, setTournamentShareLinks] = useState({});
  const [tournamentMatches, setTournamentMatches] = useState({});
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();
  const poolDetailsRef = useRef(initialPool?.id ? { [initialPool.id]: initialPool } : {});
  const tournamentInvitesRef = useRef({});
  const tournamentShareLinksRef = useRef({});
  const tournamentMatchesRef = useRef({});
  const pendingPoolDetailIdsRef = useRef(new Set());
  const pendingTournamentDetailIdsRef = useRef(new Set());
  const workspaceLoadPromiseRef = useRef(null);
  const lastWorkspaceLoadRef = useRef({ key: null, completedAt: 0 });

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

  const removeCandidateFromWorkspace = useCallback((poolId, candidateId) => {
    setPools((current) =>
      sortManagedPools(
        current.map((pool) =>
          pool.id === poolId
            ? {
                ...pool,
                candidateCount: Math.max((pool.candidateCount || 0) - 1, 0)
              }
            : pool
        )
      )
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
          candidates: (pool.candidates || []).filter((entry) => entry.id !== candidateId)
        }
      };
    });
  }, []);

  const replaceCandidateInWorkspace = useCallback((poolId, nextCandidate) => {
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
          candidates: (pool.candidates || []).map((candidate) =>
            candidate.id === nextCandidate.id ? { ...candidate, ...nextCandidate } : candidate
          )
        }
      };
    });
  }, []);

  const replacePoolInWorkspace = useCallback((nextPool) => {
    if (!nextPool?.id) {
      return;
    }

    setPools((current) =>
      sortManagedPools(
        current.map((pool) => (pool.id === nextPool.id ? { ...pool, ...nextPool } : pool))
      )
    );
    setPoolDetails((current) => ({
      ...current,
      [nextPool.id]: nextPool
    }));
  }, []);

  const replaceTournamentInWorkspace = useCallback((tournamentId, nextTournament) => {
    setTournaments((current) =>
      sortManagedBrackets(
        current.map((tournament) => (tournament.id === tournamentId ? nextTournament : tournament))
      )
    );
  }, []);

  const replaceTournamentMatchInWorkspace = useCallback((tournamentId, nextMatch) => {
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
        [tournamentId]: existingMatches.map((match) =>
          match.id === nextMatch.id ? { ...match, ...nextMatch } : match
        )
      };
    });
  }, []);

  const refreshTournamentMatches = useCallback(async (tournamentId) => {
    if (!tournamentId) {
      return [];
    }

    const data = await listTournamentMatches(tournamentId);
    const nextMatches = data.items ?? [];

    setTournamentMatches((current) => ({
      ...current,
      [tournamentId]: nextMatches
    }));

    return nextMatches;
  }, []);

  const setTournamentShareLink = useCallback((tournamentId, shareLink) => {
    setTournamentShareLinks((current) => ({
      ...current,
      [tournamentId]: [shareLink]
    }));
  }, []);

  const loadFriendsTournamentMeta = useCallback(async (nextTournaments) => {
    const withFriendsTournaments = (nextTournaments ?? []).filter(
      (tournament) =>
        tournament.sharingMode === "with_friends" &&
        (tournament.status === "draft" || tournament.status === "active")
    );

    const inviteEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.kind !== "parallel_parent")
        .map(async (tournament) => {
          const data = await listTournamentInvites(tournament.id);
          return [tournament.id, data.items ?? []];
        })
    );

    const parallelEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.kind === "parallel_parent")
        .map(async (tournament) => {
          const data = await getParallelTournament(tournament.id);
          return [tournament.id, data.item?.participants ?? []];
        })
    );

    const linkEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.status === "draft" || tournament.status === "active")
        .map(async (tournament) => {
          const data =
            tournament.kind === "parallel_parent"
              ? await listParallelTournamentShareLinks(tournament.id)
              : await listTournamentShareLinks(tournament.id);
          return [tournament.id, data.items ?? []];
        })
    );

    setTournamentInvites(Object.fromEntries([...inviteEntries, ...parallelEntries]));
    setTournamentShareLinks(Object.fromEntries(linkEntries));
  }, []);

  const ensurePoolDetails = useCallback(async (poolId) => {
    if (!poolId) {
      return null;
    }

    if (poolDetailsRef.current[poolId]) {
      return poolDetailsRef.current[poolId];
    }

    if (pendingPoolDetailIdsRef.current.has(poolId)) {
      return null;
    }

    pendingPoolDetailIdsRef.current.add(poolId);

    try {
      const data = await getPool(poolId, { candidateLimit: 24 });
      setPoolDetails((current) => ({
        ...current,
        [poolId]: data.item
      }));
      return data.item;
    } finally {
      pendingPoolDetailIdsRef.current.delete(poolId);
    }
  }, []);

  const ensurePoolInWorkspace = useCallback(async (poolId) => {
    const pool = await ensurePoolDetails(poolId);

    if (!pool) {
      return null;
    }

    setPools((current) =>
      current.some((item) => item.id === pool.id)
        ? current
        : sortManagedPools([...current, pool])
    );

    return pool;
  }, [ensurePoolDetails]);
  const ensureTournamentWorkspaceDetails = useCallback(async (tournament) => {
    if (!tournament?.id) {
      return;
    }

    if (pendingTournamentDetailIdsRef.current.has(tournament.id)) {
      return;
    }

    const needsMatches =
      tournament.kind !== "parallel_parent" &&
      tournament.status === "active" &&
      !tournamentMatchesRef.current[tournament.id];
    const needsInvites =
      tournament.sharingMode === "with_friends" &&
      (tournament.status === "draft" || tournament.status === "active") &&
      !tournamentInvitesRef.current[tournament.id];
    const needsShareLinks =
      tournament.sharingMode === "with_friends" &&
      (tournament.status === "draft" || tournament.status === "active") &&
      !tournamentShareLinksRef.current[tournament.id];

    if (!needsMatches && !needsInvites && !needsShareLinks) {
      return;
    }

    pendingTournamentDetailIdsRef.current.add(tournament.id);

    try {
      const tasks = [];

      if (needsMatches) {
        tasks.push(
          listTournamentMatches(tournament.id).then((data) => {
            setTournamentMatches((current) => ({
              ...current,
              [tournament.id]: data.items ?? []
            }));
          })
        );
      }

      if (needsInvites || needsShareLinks) {
        if (tournament.kind === "parallel_parent") {
          tasks.push(
            getParallelTournament(tournament.id).then((data) => {
              if (needsInvites) {
                setTournamentInvites((current) => ({
                  ...current,
                  [tournament.id]: data.item?.participants ?? []
                }));
              }
            })
          );
        } else if (needsInvites) {
          tasks.push(
            listTournamentInvites(tournament.id).then((data) => {
              setTournamentInvites((current) => ({
                ...current,
                [tournament.id]: data.items ?? []
              }));
            })
          );
        }

        if (needsShareLinks) {
          tasks.push(
            (tournament.kind === "parallel_parent"
              ? listParallelTournamentShareLinks(tournament.id)
              : listTournamentShareLinks(tournament.id)
            ).then((data) => {
              setTournamentShareLinks((current) => ({
                ...current,
                [tournament.id]: data.items ?? []
              }));
            })
          );
        }
      }

      await Promise.all(tasks);
    } finally {
      pendingTournamentDetailIdsRef.current.delete(tournament.id);
    }
  }, []);

  const loadWorkspace = useCallback(({ force = false } = {}) => {
    const workspaceKey =
      workspaceView === "pools" ? `pools:${poolPage}` : `tournaments:${tournamentStage}:${tournamentPage}`;
    const lastLoad = lastWorkspaceLoadRef.current;

    // Route transitions and React effects can ask for the exact same workspace
    // within milliseconds. Reuse that completed result; mutations pass force.
    if (!force && lastLoad.key === workspaceKey && Date.now() - lastLoad.completedAt < 1_500) {
      return Promise.resolve();
    }

    return runSingleFlight(workspaceLoadPromiseRef, async () => {
      if (workspaceView === "pools") {
        const poolData = await listPools({
          limit: POOL_PAGE_SIZE,
          offset: (poolPage - 1) * POOL_PAGE_SIZE
        });
        const listedPools = poolData.items ?? [];
        // A direct /pools/[id] route already has its pool from the server.
        // Keep that record mounted while the paginated list loads, even when
        // it falls outside the current page, so the detail view never flashes
        // through an empty workspace.
        const sortedPools = sortManagedPools(
          initialPool?.id && !listedPools.some((pool) => pool.id === initialPool.id)
            ? [...listedPools, initialPool]
            : listedPools
        );
        const totalCount = Number(poolData.meta?.totalCount ?? listedPools.length);
        const totalPages = Math.max(1, Math.ceil(totalCount / POOL_PAGE_SIZE));

        setPoolPagination({
          page: Math.min(poolPage, totalPages),
          pageSize: POOL_PAGE_SIZE,
          totalCount,
          hasNextPage: Boolean(poolData.meta?.hasNextPage)
        });

        if (poolPage > totalPages) {
          setPoolPage(totalPages);
        }

        if (poolPage === 1) {
          setPools(sortedPools);
          setPoolDetails((current) =>
            Object.fromEntries(
              Object.entries(current).filter(([poolId]) =>
                sortedPools.some((pool) => pool.id === poolId)
              )
            )
          );
          setExpandedPoolId((current) =>
            current && sortedPools.some((pool) => pool.id === current) ? current : null
          );
        } else {
          setPools((current) =>
            sortManagedPools([
              ...current,
              ...sortedPools.filter((pool) => !current.some((existing) => existing.id === pool.id))
            ])
          );
        }
        return;
      }

      const tournamentOffset = (tournamentPage - 1) * TOURNAMENT_PAGE_SIZE;
      const [tournamentData, parallelTournamentData] = await Promise.all([
        listTournaments({ limit: TOURNAMENT_PAGE_SIZE, offset: tournamentOffset, status: tournamentStage }),
        listParallelTournaments({ limit: TOURNAMENT_PAGE_SIZE, offset: tournamentOffset, status: tournamentStage }).catch(() => ({ items: [], meta: { hasNextPage: false } }))
      ]);
      setTournamentPagination({
        page: tournamentPage,
        pageSize: TOURNAMENT_PAGE_SIZE,
        hasNextPage: Boolean(tournamentData.meta?.hasNextPage || parallelTournamentData.meta?.hasNextPage)
      });
      const standardCounts = tournamentData.meta?.statusCounts ?? {};
      const parallelCounts = parallelTournamentData.meta?.statusCounts ?? {};
      setTournamentStatusCounts({
        draft: Number(standardCounts.draft ?? 0) + Number(parallelCounts.draft ?? 0),
        active: Number(standardCounts.active ?? 0) + Number(parallelCounts.active ?? 0),
        complete: Number(standardCounts.complete ?? 0) + Number(parallelCounts.complete ?? 0)
      });
      const normalizedTournaments = sortManagedBrackets([
        ...(tournamentData.items ?? [])
          .filter((item) => !item.parentParallelTournamentId)
          .map((item) => ({ ...item, kind: "standard" })),
        ...(parallelTournamentData.items ?? []).map(normalizeParallelBracketItem)
      ]);

      if (tournamentPage === 1) {
        setTournaments(normalizedTournaments);
        setTournamentMatches((current) =>
          Object.fromEntries(Object.entries(current).filter(([tournamentId]) => normalizedTournaments.some((tournament) => tournament.id === tournamentId)))
        );
        setTournamentInvites((current) =>
          Object.fromEntries(Object.entries(current).filter(([tournamentId]) => normalizedTournaments.some((tournament) => tournament.id === tournamentId)))
        );
        setTournamentShareLinks((current) =>
          Object.fromEntries(Object.entries(current).filter(([tournamentId]) => normalizedTournaments.some((tournament) => tournament.id === tournamentId)))
        );
      } else {
        setTournaments((current) =>
          sortManagedBrackets([
            ...current,
            ...normalizedTournaments.filter((tournament) => !current.some((existing) => existing.id === tournament.id))
          ])
        );
      }
    }).then(() => {
      lastWorkspaceLoadRef.current = {
        key: workspaceKey,
        completedAt: Date.now()
      };
    });
  }, [initialPool, poolPage, setExpandedPoolId, tournamentPage, tournamentStage, workspaceView]);
  useEffect(() => {
    startWorkspaceTransition(async () => {
      try {
        await loadWorkspace();
      } catch (error) {
        setErrorMessage(error.message);
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
    poolPage,
    poolPagination,
    pools,
    refreshTournamentMatches,
    removeCandidateFromWorkspace,
    replaceCandidateInWorkspace,
    replacePoolInWorkspace,
    replaceTournamentMatchInWorkspace,
    replaceTournamentInWorkspace,
    setPoolPage,
    setTournamentPage,
    tournamentPage,
    tournamentPagination,
    tournamentStatusCounts,
    setTournamentShareLink,
    tournamentInvites,
    tournamentMatches,
    tournaments,
    tournamentShareLinks
  };
}






