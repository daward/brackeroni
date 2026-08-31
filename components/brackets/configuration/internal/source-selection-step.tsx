"use client";

import type { RefObject } from "react";
import { ContentCard, CreateCard } from "@/components/shared";
import type { PoolCandidate, PoolSelectionOption } from "@/lib/pools/types";
import { LocalPoolBuilder } from "./wizard-local-pool-builder";
import { WizardQuestion } from "./wizard-question";
import styles from "./source-selection-step.module.css";
import choiceStyles from "./wizard-choice.module.css";

type SourceSelectionStepProps = {
  sourceMode: "existing" | "new";
  sourcePoolId: string;
  pools: PoolSelectionOption[];
  hasMorePools: boolean;
  loadingMorePools: boolean;
  loadSentinelRef: RefObject<HTMLDivElement | null>;
  onSelectPool: (pool: PoolSelectionOption) => void;
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
      <p className={`ui-copy ${styles.introCopy}`}>Start with a saved pool, or create a new one for this bracket.</p>
      <div className={styles.sourceGrid}>
        <CreateCard
          type="button"
          onClick={() => (onCreatePoolWorkspace ? onCreatePoolWorkspace() : onSourceModeChange("new"))}
          icon="+"
          title="Add a pool"
          description="Start a new candidate set."
        />
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
              <span className={`ui-section-kicker ${styles.poolCount}`}>
                {pool.candidateCount} {pool.candidateCount === 1 ? "candidate" : "candidates"}
              </span>
              {pool.description ? <span className={`${choiceStyles.description} ${choiceStyles.compactDescription}`}>{pool.description}</span> : null}
            </ContentCard>
          );
        })}
      </div>
      {hasMorePools ? (
        <div ref={loadSentinelRef} className={styles.loadSentinel} aria-live="polite">
          {loadingMorePools ? <span className="sr-only">Loading more pools</span> : null}
        </div>
      ) : null}
    </div>
  );
}
