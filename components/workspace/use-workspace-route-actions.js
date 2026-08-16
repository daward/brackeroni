import { useEffect, useRef } from "react";

import { favoritePool } from "@/lib/client-api/create-workspace";



export function useWorkspaceRouteActions({

  beginAction,

  createDraftBracket,

  createDraftBracketFromPool,

  createPoolRecord,

  endAction,

  loadWorkspace,

  openPool,

  openSeedingEditor,

  pools,

  router,

  searchParams,

  setErrorMessage,

  setExpandedDraftTournamentId,

  setSuccessMessage,

  setTournamentStageView,

  setWorkspaceView,

  startTransition,

  tournaments

}) {

  const actionSearchParamsHandledRef = useRef({

    favoritePoolId: null,

    makeBracketFromPoolId: null,

    newBracketPreset: null,

    openSeedingTournamentId: null,

    newPoolForBracket: null

  });



  useEffect(() => {
    const shouldCreatePoolForBracket = searchParams?.get("newPoolForBracket");

    if (!shouldCreatePoolForBracket || actionSearchParamsHandledRef.current.newPoolForBracket === shouldCreatePoolForBracket) {
      return;
    }

    actionSearchParamsHandledRef.current.newPoolForBracket = shouldCreatePoolForBracket;
    startTransition(async () => {
      const pool = await createPoolRecord({ name: "Untitled Pool", switchToPools: true });
      if (!pool?.id) {
        actionSearchParamsHandledRef.current.newPoolForBracket = null;
        return;
      }
      router.replace(`/pools/${pool.id}?fromBracketSetup=1`);
    });
  }, [createPoolRecord, router, searchParams, startTransition]);

  useEffect(() => {
    const requestedFavoritePoolId = searchParams?.get("favoritePool");

    if (!requestedFavoritePoolId) {
      return;
    }

    if (actionSearchParamsHandledRef.current.favoritePoolId === requestedFavoritePoolId) {
      return;
    }

    actionSearchParamsHandledRef.current.favoritePoolId = requestedFavoritePoolId;
    beginAction(`favorite-pool:${requestedFavoritePoolId}`);
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        const data = await favoritePool(requestedFavoritePoolId);

        await loadWorkspace({ force: true });
        setWorkspaceView("pools");
        openPool(data.item.id, { history: "replace" });
        setSuccessMessage(`Added ${data.item.name} to your pools.`);

      } catch (error) {
        actionSearchParamsHandledRef.current.favoritePoolId = null;
        setErrorMessage(error.message || "Failed to add pool to favorites.");
      } finally {
        endAction(`favorite-pool:${requestedFavoritePoolId}`);
      }
    });
  }, [router, searchParams, startTransition]);

  useEffect(() => {
    const requestedPoolId = searchParams?.get("makeBracketFromPool");

    if (!requestedPoolId || pools.length === 0) {
      return;
    }

    if (actionSearchParamsHandledRef.current.makeBracketFromPoolId === requestedPoolId) {
      return;
    }

    const requestedPool = pools.find((pool) => pool.id === requestedPoolId);
    if (!requestedPool) {
      return;
    }

    actionSearchParamsHandledRef.current.makeBracketFromPoolId = requestedPoolId;

    startTransition(async () => {
      const createdBracket = await createDraftBracketFromPool(requestedPool);

      if (!createdBracket?.id) {
        actionSearchParamsHandledRef.current.makeBracketFromPoolId = null;
        return;
      }

      router.replace("/brackets?stage=draft");
    });
  }, [pools, router, searchParams, startTransition]);

  useEffect(() => {
    const shouldOpenNewBracket = searchParams?.get("newBracket");

    if (!shouldOpenNewBracket) {
      return;
    }

    const presetKey = [
      shouldOpenNewBracket,
      searchParams?.get("sharingMode") || "",
      searchParams?.get("visibility") || "",
      searchParams?.get("resultMode") || "",
      searchParams?.get("advancementMode") || ""
    ].join("|");

    if (actionSearchParamsHandledRef.current.newBracketPreset === presetKey) {
      return;
    }

    actionSearchParamsHandledRef.current.newBracketPreset = presetKey;

    startTransition(async () => {
      const createdBracket = await createDraftBracket({
        sharingMode: searchParams?.get("sharingMode") || "private",
        visibility: searchParams?.get("visibility") || "private",
        votingAccess: searchParams?.get("votingAccess") || "signed_in_only",
        resultMode: searchParams?.get("resultMode") || "winner_only",
        advancementMode: searchParams?.get("advancementMode") || "vote_winner",
        playStyle: searchParams?.get("playStyle") || "fixed_bracket",
        tieBreakMode: searchParams?.get("tieBreakMode") || "higher_seed_wins"
      });

      if (!createdBracket?.id) {
        actionSearchParamsHandledRef.current.newBracketPreset = null;
        return;
      }

      setWorkspaceView("tournaments");
      setTournamentStageView("draft");
      setExpandedDraftTournamentId(createdBracket.id);
      router.replace("/brackets?stage=draft");
    });
  }, [createDraftBracket, router, searchParams, startTransition]);

  useEffect(() => {
    const tournamentId = searchParams?.get("openSeeding");
    if (!tournamentId) {
      return;
    }

    if (actionSearchParamsHandledRef.current.openSeedingTournamentId === tournamentId) {
      return;
    }

    const tournament = tournaments.find((item) => item.id === tournamentId);
    if (!tournament) {
      return;
    }

    actionSearchParamsHandledRef.current.openSeedingTournamentId = tournamentId;
    openSeedingEditor(tournament)
      .then(() => router.replace("/brackets?stage=draft"))
      .catch((error) => {
        actionSearchParamsHandledRef.current.openSeedingTournamentId = null;
        setErrorMessage(error.message || "Failed to open seeding.");
      });
  }, [openSeedingEditor, router, searchParams, tournaments]);

}


