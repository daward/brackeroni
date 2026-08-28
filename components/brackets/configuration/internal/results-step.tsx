"use client";

import { estimateTournamentEffort } from "@/lib/brackets/engine/effort-estimates";
import type { BracketAdvancementMode, BracketPlayStyle } from "@/lib/brackets/types";
import type { ResultMode } from "../types";
import { ResultModeChoices } from "./wizard-choice-controls";
import { WizardQuestion } from "./wizard-question";
import styles from "./wizard-choice.module.css";

type ResultsStepProps = {
  playStyle: BracketPlayStyle;
  resultMode: ResultMode;
  advancementMode: BracketAdvancementMode;
  audienceMode: "private" | "friends" | "public";
  candidateCount: number;
  onResultModeChange: (value: ResultMode) => void;
};

export function ResultsStep({ playStyle, resultMode, advancementMode, audienceMode, candidateCount, onResultModeChange }: ResultsStepProps) {
  const effortEstimate = estimateTournamentEffort({ candidateCount, resultMode, playStyle, advancementMode });

  return (
    <div className={styles.decisionStack}>
      <div className={styles.decisionGroup}>
        <WizardQuestion>What should the bracket decide?</WizardQuestion>
        <ResultModeChoices value={resultMode} audienceMode={audienceMode} onChange={onResultModeChange} />
      </div>
      <EffortEstimate estimate={effortEstimate} />
    </div>
  );
}

function EffortEstimate({ estimate }: { estimate: ReturnType<typeof estimateTournamentEffort> }) {
  return (
    <section className={styles.effortEstimate} aria-label="Estimated voting effort">
      <div>
        <p className={`display-face ${styles.effortHeading}`}>Effort estimate</p>
        <p className={`ui-copy ${styles.effortCopy}`}>{getEstimateCopy(estimate)}</p>
      </div>
      <dl className={styles.effortStats}>
        <div>
          <dt className={`display-face ${styles.effortLabel}`}>Votes</dt>
          <dd className={`display-face ${styles.effortValue}`}>{formatVotes(estimate.estimatedVotesPerParticipant)}</dd>
        </div>
        <div>
          <dt className={`display-face ${styles.effortLabel}`}>Rounds</dt>
          <dd className={`display-face ${styles.effortValue}`}>{formatRounds(estimate)}</dd>
        </div>
      </dl>
    </section>
  );
}

function getEstimateCopy(estimate: ReturnType<typeof estimateTournamentEffort>) {
  if (estimate.candidateCount < 2) {
    return "Add at least two contenders to estimate voting effort.";
  }

  if (!estimate.synchronized) {
    return `Based on ${estimate.candidateCount} contenders. Participants vote independently, so the group does not wait between rounds.`;
  }

  return `Based on ${estimate.candidateCount} contenders. ${estimate.note}`;
}

function formatVotes(value: number) {
  return `~${value} per participant`;
}

function formatRounds(estimate: ReturnType<typeof estimateTournamentEffort>) {
  if (!estimate.synchronized) return "None synchronized";
  return `~${estimate.estimatedSynchronizedRounds}`;
}
