"use client";

import type { RefObject } from "react";
import type { BracketIntentPreset } from "@/lib/brackets/intent-presets";
import type { BracketAdvancementMode, BracketPlayStyle, BracketResultMode, BracketTieBreakMode } from "@/lib/brackets/types";
import type { PoolCandidate, PoolSelectionOption } from "@/lib/pools/types";
import type { AudienceMode, SeedingMode } from "../types";
import { AccessStep } from "./access-step";
import { MatchupsStep } from "./matchups-step";
import { ResultsStep } from "./results-step";
import { ReviewStep } from "./review-step";
import { SeedingStep } from "./seeding-step";
import { SourceSelectionStep } from "./source-selection-step";
import setupStyles from "./bracket-setup.module.css";

const STEPS = ["Contenders", "Audience", "Winners", "Seeding", "Results", "Review"];

type WizardLayoutProps = {
  fullPage: boolean;
  step: number;
  sourceMode: "existing" | "new";
  sourcePoolId: string;
  pools: PoolSelectionOption[];
  hasMorePools: boolean;
  loadingMorePools: boolean;
  poolLoadSentinelRef: RefObject<HTMLDivElement | null>;
  poolName: string;
  candidates: PoolCandidate[];
  playStyle: BracketPlayStyle;
  resultMode: BracketResultMode;
  advancementMode: BracketAdvancementMode;
  tieBreakMode: BracketTieBreakMode;
  seedingMode: SeedingMode;
  customSeedEntries: PoolCandidate[];
  customSeedLoading: boolean;
  draggingSeedCandidateId: string | null;
  audienceMode: AudienceMode;
  title: string;
  selectedName: string;
  selectedCount: number;
  error: string;
  creating: boolean;
  presetContext?: BracketIntentPreset | null;
  onCancel: () => void;
  onStepChange: (step: number) => void;
  onSelectPool: (pool: PoolSelectionOption) => void;
  onCreatePoolWorkspace?: () => void;
  onSourceModeChange: (mode: "existing" | "new") => void;
  onPoolNameChange: (name: string) => void;
  onCandidatesChange: (candidates: PoolCandidate[]) => void;
  onPlayStyleChange: (value: BracketPlayStyle) => void;
  onResultModeChange: (mode: BracketResultMode) => void;
  onAdvancementModeChange: (value: BracketAdvancementMode) => void;
  onTieBreakModeChange: (value: BracketTieBreakMode) => void;
  onSeedingModeChange: (mode: SeedingMode) => void;
  onSeedDragStart: (candidateId: string) => void;
  onSeedDragEnd: () => void;
  onSeedDrop: (targetCandidateId: string) => void;
  onAudienceModeChange: (mode: AudienceMode) => void;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
};

export function WizardLayout(props: WizardLayoutProps) {
  const content = getStepContent(props);
  const canContinue = props.step < STEPS.length - 1 && !(props.step === 0 && props.sourceMode === "existing");
  const shellClassName = props.fullPage ? setupStyles.shell : setupStyles.modalShell;
  return (
    <div className={props.fullPage ? setupStyles.page : setupStyles.modalBackdrop}>
      <section className={`${setupStyles.wizardShell} ${shellClassName}`}>
        <header className={props.fullPage ? setupStyles.header : setupStyles.modalHeader}>
          <h1 className={`display-face ${setupStyles.title}`}>New bracket</h1>
          <button type="button" onClick={props.onCancel} className={`display-face ${setupStyles.cancelButton}`}>
            {props.fullPage ? "Back to Brackets" : "Close"}
          </button>
        </header>
        <div className={props.fullPage ? setupStyles.steps : setupStyles.modalSteps}>
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={index > props.step}
              aria-current={index === props.step ? "step" : undefined}
              onClick={() => index <= props.step && props.onStepChange(index)}
              className={`display-face ${setupStyles.stepButton} ${getStepClassName(index, props.step)}`}
            >
              <span className="hidden sm:inline">{index + 1}. </span>
              {label}
            </button>
          ))}
        </div>
        <div className={props.fullPage ? setupStyles.content : setupStyles.modalContent}>
          {content}
          {props.error ? <p className={setupStyles.error}>{props.error}</p> : null}
        </div>
        <footer className={props.fullPage ? setupStyles.actions : setupStyles.modalActions}>
          <button type="button" onClick={props.onBack} className="ui-button ui-button-muted">
            {getBackLabel(props.step, props.fullPage)}
          </button>
          {canContinue ? (
            <button type="button" onClick={props.onNext} className="ui-button ui-button-primary">
              Continue
            </button>
          ) : null}
          {props.step === STEPS.length - 1 ? (
            <button type="button" onClick={props.onCreate} disabled={props.creating} className="ui-button ui-button-primary">
              {props.creating ? "Creating" : "Create bracket"}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function getStepClassName(index: number, step: number) {
  if (index === step) return setupStyles.stepActive;
  if (index < step) return setupStyles.stepComplete;
  return setupStyles.stepLocked;
}

function getBackLabel(step: number, fullPage: boolean) {
  if (step !== 0) return "Back";
  return fullPage ? "Back to Brackets" : "Cancel";
}

function getStepContent(props: WizardLayoutProps) {
  switch (props.step) {
    case 0:
      return (
        <SourceSelectionStep
          sourceMode={props.sourceMode}
          sourcePoolId={props.sourcePoolId}
          pools={props.pools}
          hasMorePools={props.hasMorePools}
          loadingMorePools={props.loadingMorePools}
          loadSentinelRef={props.poolLoadSentinelRef}
          onSelectPool={props.onSelectPool}
          onCreatePoolWorkspace={props.onCreatePoolWorkspace}
          onSourceModeChange={props.onSourceModeChange}
          poolName={props.poolName}
          onPoolNameChange={props.onPoolNameChange}
          candidates={props.candidates}
          onCandidatesChange={props.onCandidatesChange}
        />
      );
    case 1:
      return (
        <AccessStep
          audienceMode={props.audienceMode}
          recommendedAudienceMode={props.presetContext?.defaults.audienceMode ?? null}
          guidance={props.presetContext?.stepGuidance.audience ?? null}
          onAudienceModeChange={props.onAudienceModeChange}
        />
      );
    case 2:
      return (
        <MatchupsStep
          advancementMode={props.advancementMode}
          tieBreakMode={props.tieBreakMode}
          onAdvancementModeChange={props.onAdvancementModeChange}
          onTieBreakModeChange={props.onTieBreakModeChange}
        />
      );
    case 3:
      return (
        <SeedingStep
          playStyle={props.playStyle}
          mode={props.seedingMode}
          candidates={props.customSeedEntries}
          loading={props.customSeedLoading}
          draggingCandidateId={props.draggingSeedCandidateId}
          onPlayStyleChange={props.onPlayStyleChange}
          onModeChange={props.onSeedingModeChange}
          onDragStart={props.onSeedDragStart}
          onDragEnd={props.onSeedDragEnd}
          onDrop={props.onSeedDrop}
        />
      );
    case 4:
      return (
        <ResultsStep
          playStyle={props.playStyle}
          resultMode={props.resultMode}
          recommendedResultMode={props.presetContext?.defaults.resultMode ?? null}
          guidance={props.presetContext?.stepGuidance.results ?? null}
          advancementMode={props.advancementMode}
          audienceMode={props.audienceMode}
          candidateCount={props.selectedCount}
          onResultModeChange={props.onResultModeChange}
        />
      );
    default:
      return (
        <ReviewStep
          title={props.title}
          selectedName={props.selectedName}
          selectedCount={props.selectedCount}
          playStyle={props.playStyle}
          resultMode={props.resultMode}
          seedingMode={props.seedingMode}
          advancementMode={props.advancementMode}
          tieBreakMode={props.tieBreakMode}
          audienceMode={props.audienceMode}
          onTitleChange={props.onTitleChange}
          onStepChange={props.onStepChange}
        />
      );
  }
}
