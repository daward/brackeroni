"use client";

import type { RefObject } from "react";
import type { BracketIntentPreset } from "@/lib/brackets/intent-presets";
import type { BracketAdvancementMode, BracketPlayStyle, BracketResultMode, BracketTieBreakMode } from "@/lib/brackets/types";
import type { PoolCandidate, PoolSelectionOption } from "@/lib/pools/types";
import type { AudienceMode, BracketCreationAction, SeedingMode } from "../types";
import { AccessStep } from "./access-step";
import { MatchupsStep } from "./matchups-step";
import { NameStep } from "./name-step";
import { ResultsStep } from "./results-step";
import { ReviewStep } from "./review-step";
import { SeedingStep } from "./seeding-step";
import { SourceSelectionStep } from "./source-selection-step";
import setupStyles from "./bracket-setup.module.css";

const STEPS = ["Name", "Contenders", "Audience", "Winners", "Seeding", "Results", "Review"];

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
  onCreate: (action: BracketCreationAction) => void;
};

export function WizardLayout(props: WizardLayoutProps) {
  const content = getStepContent(props);
  const canContinue = props.step < STEPS.length - 1 && !(props.step === 1 && props.sourceMode === "existing");
  const shellClassName = props.fullPage ? setupStyles.shell : setupStyles.modalShell;
  const showHeader = !props.fullPage;
  const pageClassName = props.fullPage ? setupStyles.page : setupStyles.modalBackdrop;
  return (
    <div className={pageClassName}>
      <section className={`${setupStyles.wizardShell} ${shellClassName}`}>
        {showHeader ? (
          <header className={props.fullPage ? setupStyles.header : setupStyles.modalHeader}>
            <h1 className={`display-face ${setupStyles.title}`}>New bracket</h1>
            <button type="button" onClick={props.onCancel} className={`display-face ${setupStyles.cancelButton}`}>
              {props.fullPage ? "Back to Brackets" : "Close"}
            </button>
          </header>
        ) : null}
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
          <div className={setupStyles.actionGroup}>
            {canContinue ? (
              <button type="button" onClick={props.onNext} className="ui-button ui-button-primary">
                Continue
              </button>
            ) : null}
            {props.step === STEPS.length - 1 ? (
              <>
                <button type="button" onClick={() => props.onCreate("save_draft")} disabled={props.creating} className="ui-button ui-button-muted">
                  {props.creating ? "Saving" : "Save as draft"}
                </button>
                <button type="button" onClick={() => props.onCreate("start_voting")} disabled={props.creating} className="ui-button ui-button-primary">
                  {props.creating ? "Starting" : "Start voting"}
                </button>
              </>
            ) : null}
          </div>
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
      return <NameStep title={props.title} onTitleChange={props.onTitleChange} />;
    case 1:
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
    case 2:
      return (
        <AccessStep
          audienceMode={props.audienceMode}
          recommendedAudienceMode={props.presetContext?.defaults.audienceMode ?? null}
          guidance={props.presetContext?.stepGuidance.audience ?? null}
          onAudienceModeChange={props.onAudienceModeChange}
        />
      );
    case 3:
      return (
        <MatchupsStep
          advancementMode={props.advancementMode}
          tieBreakMode={props.tieBreakMode}
          onAdvancementModeChange={props.onAdvancementModeChange}
          onTieBreakModeChange={props.onTieBreakModeChange}
        />
      );
    case 4:
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
    case 5:
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
          onStepChange={props.onStepChange}
        />
      );
  }
}
