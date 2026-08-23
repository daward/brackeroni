"use client";

import type { RefObject } from "react";
import { Plus } from "lucide-react";
import { ContentCard } from "@/components/shared";
import { LocalPoolBuilder } from "./wizard-local-pool-builder";
import { WizardQuestion } from "./wizard-question";
import type { BracketPoolOption } from "../types";
import type { PoolCandidate } from "@/lib/pools/types";
import styles from "./source-selection-step.module.css";
import choiceStyles from "./wizard-choice.module.css";

type SourceSelectionStepProps = {
  sourceMode: "existing" | "new";
  sourcePoolId: string;
  pools: BracketPoolOption[];
  hasMorePools: boolean;
  loadingMorePools: boolean;
  loadSentinelRef: RefObject<HTMLDivElement | null>;
  onSelectPool: (pool: BracketPoolOption) => void;
  onCreatePoolWorkspace?: () => void;
  onSourceModeChange: (mode: "existing" | "new") => void;
  poolName: string;
  onPoolNameChange: (name: string) => void;
  candidates: PoolCandidate[];
  onCandidatesChange: (candidates: PoolCandidate[]) => void;
};

export function SourceSelectionStep({
  sourceMode,
  sourcePoolId,
  pools,
  hasMorePools,
  loadingMorePools,
  loadSentinelRef,
  onSelectPool,
  onCreatePoolWorkspace,
  onSourceModeChange,
  poolName,
  onPoolNameChange,
  candidates,
  onCandidatesChange,
}: SourceSelectionStepProps) {
  if (sourceMode === "new" && !onCreatePoolWorkspace) {
    return (
      <div className="space-y-4">
        {pools.length ? (
          <button type="button" onClick={() => onSourceModeChange("existing")} className="ui-button ui-button-muted">
            ← Choose a saved pool
          </button>
        ) : null}
        <LocalPoolBuilder poolName={poolName} onPoolNameChange={onPoolNameChange} candidates={candidates} onCandidatesChange={onCandidatesChange} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <WizardQuestion>Where will your contenders come from?</WizardQuestion>
      <p className="ui-copy text-sm leading-6 text-[var(--muted)]">Start with a saved pool, or create a new one for this bracket.</p>
      <div className={styles.sourceGrid}>
        <ContentCard
          as="button"
          type="button"
          onClick={() => (onCreatePoolWorkspace ? onCreatePoolWorkspace() : onSourceModeChange("new"))}
          interactive
          className={`${choiceStyles.card} ${choiceStyles.tallCard}`}
        >
          <Plus aria-hidden="true" size={22} strokeWidth={3} className={choiceStyles.icon} />
          <span className={`display-face ${choiceStyles.standaloneTitle}`}>Create a new pool</span>
          <span className={`${choiceStyles.description} ${choiceStyles.compactDescription}`}>Add or import contenders without leaving setup.</span>
        </ContentCard>
        {pools.map((pool) => {
          const selected = sourcePoolId === pool.id;
          return (
            <ContentCard
              as="button"
              key={pool.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectPool(pool)}
              interactive
              selected={selected}
              className={`${choiceStyles.card} ${choiceStyles.tallCard}`}
            >
              <span className={`display-face ${choiceStyles.title}`}>{pool.name}</span>
              <span className="ui-section-kicker mt-3 block text-[var(--accent-3)]">
                {pool.candidateCount} {pool.candidateCount === 1 ? "candidate" : "candidates"}
              </span>
              {pool.description ? <span className={`${choiceStyles.description} ${choiceStyles.compactDescription}`}>{pool.description}</span> : null}
            </ContentCard>
          );
        })}
      </div>
      {hasMorePools ? (
        <div ref={loadSentinelRef} className="h-px" aria-live="polite">
          {loadingMorePools ? <span className="sr-only">Loading more pools</span> : null}
        </div>
      ) : null}
    </div>
  );
}
