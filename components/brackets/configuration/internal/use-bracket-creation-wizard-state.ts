"use client";

import { useState } from "react";
import { getPool } from "@/lib/client-api/create-workspace";
import type { BracketAdvancementMode, BracketPlayStyle, BracketTieBreakMode } from "@/lib/brackets/types";
import type { PoolCandidate } from "@/lib/pools/types";
import type { AudienceMode, BracketCreationInput, BracketCreationWizardProps, BracketPoolOption, ResultMode, SeedingMode } from "../types";
import { useWizardPools } from "./use-wizard-pools";

export const WIZARD_STEP_COUNT = 6;

type SourceMode = "existing" | "new";

type WizardStateParams = Pick<BracketCreationWizardProps, "pools" | "initialPoolId" | "initialConfig" | "initialStep" | "onCancel" | "onCreate">;

function getSourceMode(initialConfig: BracketCreationWizardProps["initialConfig"], initialPoolId: string, pools: BracketCreationWizardProps["pools"]) {
  return initialConfig?.sourcePoolId || initialPoolId || pools.length ? "existing" : "new";
}

export function useBracketCreationWizardState({ pools, initialPoolId = "", initialConfig = null, initialStep = 0, onCancel, onCreate }: WizardStateParams) {
  const [step, setStep] = useState(initialStep);
  const [sourceMode, setSourceMode] = useState<SourceMode>(getSourceMode(initialConfig, initialPoolId, pools));
  const [sourcePoolId, setSourcePoolId] = useState(initialConfig?.sourcePoolId || initialPoolId || pools[0]?.id || "");
  const [poolName, setPoolName] = useState("");
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [title, setTitle] = useState(initialConfig?.title || "");
  const [playStyle, setPlayStyle] = useState<BracketPlayStyle>(initialConfig?.playStyle || "fixed_bracket");
  const [resultMode, setResultMode] = useState<ResultMode>((initialConfig?.resultMode as ResultMode) || "winner_only");
  const [advancementMode, setAdvancementMode] = useState<BracketAdvancementMode>(initialConfig?.advancementMode || "vote_winner");
  const [tieBreakMode, setTieBreakMode] = useState<BracketTieBreakMode>(initialConfig?.tieBreakMode || "higher_seed_wins");
  const [seedingMode, setSeedingMode] = useState<SeedingMode>("pool_order");
  const [customSeedEntries, setCustomSeedEntries] = useState<PoolCandidate[]>([]);
  const [customSeedLoading, setCustomSeedLoading] = useState(false);
  const [draggingSeedCandidateId, setDraggingSeedCandidateId] = useState<string | null>(null);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>(initialConfig?.audienceMode || "private");
  const [error, setError] = useState("");
  const {
    pools: availablePools,
    hasMore: hasMorePools,
    loadingMore: loadingMorePools,
    loadSentinelRef: poolLoadSentinelRef,
  } = useWizardPools(pools, sourceMode === "existing", setError);
  const selectedPool = availablePools.find((pool) => pool.id === sourcePoolId) || null;

  async function chooseSeedingMode(mode: SeedingMode) {
    setSeedingMode(mode);
    if (mode !== "custom" || customSeedEntries.length) return;
    if (sourceMode === "new") {
      setCustomSeedEntries(candidates);
      return;
    }
    if (!selectedPool) return;
    setCustomSeedLoading(true);
    try {
      setCustomSeedEntries((await getPool(selectedPool.id)).item?.candidates || []);
    } catch {
      setError("We couldn't load this pool's contenders for seeding.");
    } finally {
      setCustomSeedLoading(false);
    }
  }

  function moveCustomSeedEntry(candidateId: string | null, targetCandidateId: string) {
    if (!candidateId || candidateId === targetCandidateId) return;
    setCustomSeedEntries((current) => {
      const sourceIndex = current.findIndex((candidate) => candidate.id === candidateId);
      const targetIndex = current.findIndex((candidate) => candidate.id === targetCandidateId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function canProceedFromSource() {
    if (sourceMode === "existing" && !selectedPool) {
      setError("Choose a pool to continue.");
      return false;
    }

    if (sourceMode === "existing" && (selectedPool?.candidateCount ?? 0) < 2) {
      setError("Add at least two candidates to this pool before creating a bracket.");
      return false;
    }

    if (sourceMode === "new" && !poolName.trim()) {
      setError("Give the new pool a name.");
      return false;
    }

    if (sourceMode === "new" && candidates.length < 2) {
      setError("Add at least two candidates to continue.");
      return false;
    }

    return true;
  }

  function selectPool(pool: BracketPoolOption) {
    if ((pool.candidateCount ?? 0) < 2) {
      setError("Add at least two candidates to this pool before creating a bracket.");
      return;
    }
    setSourcePoolId(pool.id);
    setError("");
    setStep(1);
  }

  function goNext() {
    if (step === 0 && !canProceedFromSource()) return;
    if (step === 3 && seedingMode === "custom" && customSeedEntries.length < 2) {
      setError("Wait for the contenders to load before continuing.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, WIZARD_STEP_COUNT - 1));
  }

  async function handleCreate() {
    const input = buildCreationInput();
    if (!input) {
      setStep(0);
      return;
    }

    setError("");
    const created = await onCreate(input);
    if (!created) setError("We couldn't create that bracket. Please try again.");
  }

  function buildCreationInput(): BracketCreationInput | null {
    if (!canProceedFromSource()) return null;
    const source =
      sourceMode === "existing"
        ? { type: "existing" as const, pool: selectedPool! }
        : {
            type: "new" as const,
            name: poolName.trim(),
            candidates: seedingMode === "custom" ? customSeedEntries : candidates,
          };

    return {
      title: title.trim(),
      source,
      playStyle,
      resultMode,
      advancementMode,
      tieBreakMode,
      seedingMode,
      seedCandidateIds: sourceMode === "existing" && seedingMode === "custom" ? customSeedEntries.map((candidate) => candidate.id) : null,
      audienceMode,
    };
  }

  return {
    step,
    sourceMode,
    sourcePoolId,
    pools: availablePools,
    hasMorePools,
    loadingMorePools,
    poolLoadSentinelRef,
    poolName,
    candidates,
    playStyle,
    resultMode,
    advancementMode,
    tieBreakMode,
    seedingMode,
    customSeedEntries,
    customSeedLoading,
    draggingSeedCandidateId,
    audienceMode,
    title,
    selectedName: getSelectedName(sourceMode, selectedPool, poolName),
    selectedCount: getSelectedCount(sourceMode, selectedPool, candidates),
    error,
    setStep,
    selectPool,
    setSourceMode,
    setPoolName,
    setCandidates,
    setPlayStyle,
    setResultMode,
    setAdvancementMode,
    setTieBreakMode,
    chooseSeedingMode,
    setDraggingSeedCandidateId,
    setAudienceMode,
    setTitle,
    goBack: step === 0 ? onCancel : () => setStep((current) => current - 1),
    goNext,
    handleCreate,
    moveCustomSeedEntry,
  };
}

function getSelectedName(sourceMode: SourceMode, selectedPool: BracketPoolOption | null, poolName: string) {
  return sourceMode === "existing" ? selectedPool?.name || "" : poolName.trim();
}

function getSelectedCount(sourceMode: SourceMode, selectedPool: BracketPoolOption | null, candidates: PoolCandidate[]) {
  return sourceMode === "existing" ? selectedPool?.candidateCount || 0 : candidates.length;
}
