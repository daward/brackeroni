"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  normalizeParallelBracketItem,
  sortManagedBrackets,
  sortManagedPools
} from "@/components/create-panel-helpers";
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

export function useCreateWorkspaceData({ setErrorMessage, setExpandedPoolId }) {
  const [pools, setPools] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [poolDetails, setPoolDetails] = useState({});
  const [tournamentInvites, setTournamentInvites] = useState({});
  const [tournamentShareLinks, setTournamentShareLinks] = useState({});
  const [tournamentMatches, setTournamentMatches] = useState({});
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();
  const poolDetailsRef = useRef({});
  const tournamentInvitesRef = useRef({});
  const tournamentShareLinksRef = useRef({});
  const tournamentMatchesRef = useRef({});
  const pendingPoolDetailIdsRef = useRef(new Set());
  const pendingTournamentDetailIdsRef = useRef(new Set());

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
      const data = await getPool(poolId);
      setPoolDetails((current) => ({
        ...current,
        [poolId]: data.item
      }));
      return data.item;
    } finally {
      pendingPoolDetailIdsRef.current.delete(poolId);
    }
  }, []);

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

  const loadWorkspace = useCallback(async () => {
    const [poolData, tournamentData, parallelTournamentData] = await Promise.all([
      listPools(),
      listTournaments(),
      listParallelTournaments().catch(() => ({ items: [] }))
    ]);
    const sortedPools = sortManagedPools(poolData.items ?? []);
    const normalizedTournaments = sortManagedBrackets([
      ...(tournamentData.items ?? [])
        .filter((item) => !item.parentParallelTournamentId)
        .map((item) => ({ ...item, kind: "standard" })),
      ...(parallelTournamentData.items ?? []).map(normalizeParallelBracketItem)
    ]);

    setPools(sortedPools);
    setTournaments(normalizedTournaments);
    setPoolDetails((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([poolId]) =>
          sortedPools.some((pool) => pool.id === poolId)
        )
      )
    );
    setTournamentMatches((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tournamentId]) =>
          normalizedTournaments.some((tournament) => tournament.id === tournamentId)
        )
      )
    );
    setTournamentInvites((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tournamentId]) =>
          normalizedTournaments.some((tournament) => tournament.id === tournamentId)
        )
      )
    );
    setTournamentShareLinks((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tournamentId]) =>
          normalizedTournaments.some((tournament) => tournament.id === tournamentId)
        )
      )
    );
    setExpandedPoolId((current) => {
      if (!sortedPools.length) {
        return null;
      }

      if (current && sortedPools.some((pool) => pool.id === current)) {
        return current;
      }

      return null;
    });
  }, [setExpandedPoolId]);

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
    ensureTournamentWorkspaceDetails,
    poolDetails,
    pools,
    refreshTournamentMatches,
    removeCandidateFromWorkspace,
    replaceTournamentMatchInWorkspace,
    replaceTournamentInWorkspace,
    setTournamentShareLink,
    tournamentInvites,
    tournamentMatches,
    tournaments,
    tournamentShareLinks
  };
}
