"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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

export function useCreateWorkspaceData({ setErrorMessage, setExpandedPoolId }) {
  const [pools, setPools] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [poolDetails, setPoolDetails] = useState({});
  const [tournamentInvites, setTournamentInvites] = useState({});
  const [tournamentShareLinks, setTournamentShareLinks] = useState({});
  const [isWorkspacePending, startWorkspaceTransition] = useTransition();

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

  const loadWorkspace = useCallback(async () => {
    const [poolData, tournamentData, parallelTournamentData] = await Promise.all([
      listPools(),
      listTournaments(),
      listParallelTournaments().catch(() => ({ items: [] }))
    ]);
    const sortedPools = sortManagedPools(poolData.items ?? []);
    const normalizedTournaments = sortManagedBrackets([
      ...(tournamentData.items ?? []).map((item) => ({ ...item, kind: "standard" })),
      ...(parallelTournamentData.items ?? []).map(normalizeParallelBracketItem)
    ]);

    setPools(sortedPools);
    setTournaments(normalizedTournaments);
    setExpandedPoolId((current) => {
      if (!sortedPools.length) {
        return null;
      }

      if (current && sortedPools.some((pool) => pool.id === current)) {
        return current;
      }

      return null;
    });

    const detailEntries = await Promise.all(
      sortedPools.map(async (pool) => {
        const data = await getPool(pool.id);
        return [pool.id, data.item];
      })
    );

    setPoolDetails(Object.fromEntries(detailEntries));
    await loadFriendsTournamentMeta(normalizedTournaments);
  }, [loadFriendsTournamentMeta, setExpandedPoolId]);

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
    poolDetails,
    pools,
    removeCandidateFromWorkspace,
    replaceTournamentInWorkspace,
    setTournamentShareLink,
    tournamentInvites,
    tournaments,
    tournamentShareLinks
  };
}
