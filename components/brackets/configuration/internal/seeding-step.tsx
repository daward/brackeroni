"use client";

import type { PoolCandidate } from "@/lib/pools/types";
import { VersusChoice } from "./wizard-choice-controls";
import { WizardQuestion } from "./wizard-question";
import styles from "./seeding-step.module.css";

type SeedingStepProps = {
  mode: "pool_order" | "custom";
  candidates: PoolCandidate[];
  loading: boolean;
  draggingCandidateId: string | null;
  onModeChange: (mode: "pool_order" | "custom") => void;
  onDragStart: (candidateId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetCandidateId: string) => void;
};

export function SeedingStep({ mode, candidates, loading, draggingCandidateId, onModeChange, onDragStart, onDragEnd, onDrop }: SeedingStepProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <WizardQuestion>How should entries be seeded?</WizardQuestion>
        <VersusChoice
          value={mode}
          onChange={(value) => onModeChange(value as "pool_order" | "custom")}
          choices={[
            { value: "pool_order", title: "Use pool order", description: "Candidates enter in the same order as the selected pool." },
            { value: "custom", title: "Customize seeds", description: "Arrange the seed order here before creating the bracket." },
          ]}
        />
      </div>
      {mode === "custom" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <WizardQuestion>Put contenders in seed order</WizardQuestion>
            <p className={`ui-copy ${styles.helperCopy}`}>Drag a contender onto another to place it before that seed.</p>
          </div>
          {loading ? <p className={`ui-copy ${styles.loadingCopy}`}>Loading contenders…</p> : null}
          {!loading && candidates.length ? (
            <ol className={styles.seedList}>
              {candidates.map((candidate, index) => (
                <li
                  key={candidate.id}
                  draggable
                  onDragStart={() => onDragStart(candidate.id)}
                  onDragEnd={onDragEnd}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDrop(candidate.id)}
                  className={`${styles.seedRow} ${draggingCandidateId === candidate.id ? styles.seedRowDragging : ""}`}
                >
                  <span className={`display-face ${styles.seedNumber}`}>{index + 1}</span>
                  <span className={`display-face ${styles.seedName}`}>{candidate.name}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
