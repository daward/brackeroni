import { useEffect, useRef } from "react";
import type { TransitionStartFunction } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { favoritePool } from "@/lib/client-api/create-workspace";
import type {
  BracketAdvancementMode,
  BracketPlayStyle,
  BracketResultMode,
  BracketSharingMode,
  BracketTieBreakMode,
  BracketVisibility,
} from "@/lib/brackets/types";
import type { CreatePoolRecordInput } from "./use-bracket-pool-actions";
import type { DraftBracketOptions } from "./use-tournament-actions";
import type {
  ActionMarker,
  BracketStageView,
  LoadWorkspace,
  MessageSetter,
  SetExpandedDraftId,
  SetWorkspaceView,
  WorkspacePool,
  WorkspaceTournament,
} from "./workspace-internal-types";
import { getErrorMessage } from "./workspace-internal-types";

type UseBracketRouteActionsProps = {
  beginAction: ActionMarker;
  createDraftBracket: (options?: DraftBracketOptions) => Promise<WorkspaceTournament | null>;
  createDraftBracketFromPool: (pool: WorkspacePool) => Promise<WorkspaceTournament | null>;
  createPoolRecord: (options?: CreatePoolRecordInput) => Promise<WorkspacePool | null>;
  endAction: ActionMarker;
  loadWorkspace: LoadWorkspace;
  openPool: (poolId: string, options?: { history?: "push" | "replace" }) => void;
  openSeedingEditor: (tournament: WorkspaceTournament) => Promise<void>;
  pools: WorkspacePool[];
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams | null;
  setErrorMessage: MessageSetter;
  setExpandedDraftTournamentId: SetExpandedDraftId;
  setSuccessMessage: MessageSetter;
  setTournamentStageView: (stage: BracketStageView) => void;
  setWorkspaceView: SetWorkspaceView;
  startTransition: TransitionStartFunction;
  tournaments: WorkspaceTournament[];
};

const SHARING_MODES = new Set<BracketSharingMode>(["private", "with_friends"]);
const VISIBILITY_MODES = new Set<BracketVisibility>(["private", "public_listed", "public_unlisted"]);
const RESULT_MODES = new Set<BracketResultMode>([
  "winner_only",
  "full_ranking",
  "partial_ranking",
  "fast_full_rank",
  "parallel_full_ranking",
  "parallel_partial_ranking",
]);
const PLAY_STYLES = new Set<BracketPlayStyle>(["fixed_bracket", "reseed"]);
const TIE_BREAK_MODES = new Set<BracketTieBreakMode>(["higher_seed_wins", "random"]);
const ADVANCEMENT_MODES = new Set<BracketAdvancementMode>(["vote_winner", "manual_winner"]);

function getSearchParamValue<T extends string>(searchParams: ReadonlyURLSearchParams | null, key: string, allowed: Set<T>, fallback: T): T {
  const value = searchParams?.get(key);
  return value && allowed.has(value as T) ? (value as T) : fallback;
}

export function useBracketRouteActions({
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

  tournaments,
}: UseBracketRouteActionsProps) {
  const actionSearchParamsHandledRef = useRef<Record<string, string | null>>({
    favoritePoolId: null,

    makeBracketFromPoolId: null,

    newBracketPreset: null,

    openSeedingTournamentId: null,

    newPoolForBracket: null,
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
        setErrorMessage(getErrorMessage(error, "Failed to add pool to favorites."));
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
      searchParams?.get("advancementMode") || "",
    ].join("|");

    if (actionSearchParamsHandledRef.current.newBracketPreset === presetKey) {
      return;
    }

    actionSearchParamsHandledRef.current.newBracketPreset = presetKey;

    startTransition(async () => {
      const createdBracket = await createDraftBracket({
        sharingMode: getSearchParamValue(searchParams, "sharingMode", SHARING_MODES, "private"),
        visibility: getSearchParamValue(searchParams, "visibility", VISIBILITY_MODES, "private"),
        votingAccess: searchParams?.get("votingAccess") || "signed_in_only",
        resultMode: getSearchParamValue(searchParams, "resultMode", RESULT_MODES, "winner_only"),
        advancementMode: getSearchParamValue(searchParams, "advancementMode", ADVANCEMENT_MODES, "vote_winner"),
        playStyle: getSearchParamValue(searchParams, "playStyle", PLAY_STYLES, "fixed_bracket"),
        tieBreakMode: getSearchParamValue(searchParams, "tieBreakMode", TIE_BREAK_MODES, "higher_seed_wins"),
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
      .catch((error: unknown) => {
        actionSearchParamsHandledRef.current.openSeedingTournamentId = null;
        setErrorMessage(getErrorMessage(error, "Failed to open seeding."));
      });
  }, [openSeedingEditor, router, searchParams, tournaments]);
}
