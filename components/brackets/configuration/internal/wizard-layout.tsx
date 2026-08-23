"use client";

import type { RefObject } from "react";
import type { BracketAdvancementMode, BracketPlayStyle, BracketTieBreakMode } from "@/lib/brackets/types";
import type { PoolCandidate } from "@/lib/pools/types";
import type { AudienceMode, BracketPoolOption, ResultMode, SeedingMode } from "../types";
import { AccessStep } from "./access-step";
import { MatchupsStep } from "./matchups-step";
import { ReviewStep } from "./review-step";
import { SeedingStep } from "./seeding-step";
import { SourceSelectionStep } from "./source-selection-step";
import { StructureStep } from "./structure-step";
import setupStyles from "./bracket-setup.module.css";

const STEPS = ["Contenders", "Structure", "Matchups", "Seeding", "Access", "Review"];
const STEP_BUTTON_CLASS = "display-face min-w-0 flex-1 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] sm:text-[11px]";

type WizardLayoutProps = {
  fullPage: boolean;
  step: number;
  sourceMode: "existing" | "new";
  sourcePoolId: string;
  pools: BracketPoolOption[];
  hasMorePools: boolean;
  loadingMorePools: boolean;
  poolLoadSentinelRef: RefObject<HTMLDivElement | null>;
  poolName: string;
  candidates: PoolCandidate[];
  playStyle: BracketPlayStyle;
  resultMode: ResultMode;
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
  onCancel: () => void;
  onStepChange: (step: number) => void;
  onSelectPool: (pool: BracketPoolOption) => void;
  onCreatePoolWorkspace?: () => void;
  onSourceModeChange: (mode: "existing" | "new") => void;
  onPoolNameChange: (name: string) => void;
  onCandidatesChange: (candidates: PoolCandidate[]) => void;
  onPlayStyleChange: (value: BracketPlayStyle) => void;
  onResultModeChange: (mode: ResultMode) => void;
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
  const shellClassName = props.fullPage ? setupStyles.shell : "max-h-full max-w-2xl border border-[var(--line-strong)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(0,0,0,0.55)]";
  return (
    <div className={props.fullPage ? setupStyles.page : "fixed inset-0 z-50 bg-black/70 px-4 py-4 sm:flex sm:items-center sm:justify-center"}>
      <section className={`mx-auto flex w-full flex-col overflow-hidden ${shellClassName}`}>
        <header className={props.fullPage ? setupStyles.header : "flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4"}>
          <h1 className="display-face text-2xl font-black uppercase tracking-[0.06em] sm:text-3xl">New bracket</h1>
          <button type="button" onClick={props.onCancel} className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
            {props.fullPage ? "Back to Brackets" : "Close"}
          </button>
        </header>
        <div className={props.fullPage ? setupStyles.steps : "flex border-b border-[var(--line)]"}>
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={index > props.step}
              aria-current={index === props.step ? "step" : undefined}
              onClick={() => index <= props.step && props.onStepChange(index)}
              className={`${STEP_BUTTON_CLASS} ${getStepClassName(index, props.step)}`}
            >
              <span className="hidden sm:inline">{index + 1}. </span>
              {label}
            </button>
          ))}
        </div>
        <div className={props.fullPage ? setupStyles.content : "min-h-0 flex-1 overflow-y-auto px-5 py-5"}>
          {content}
          {props.error ? <p className="mt-4 text-sm text-[var(--accent-2)]">{props.error}</p> : null}
        </div>
        <footer className={props.fullPage ? setupStyles.actions : "flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4"}>
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
  if (index === step) return "border-b-2 border-[var(--accent-2)] text-[var(--ink)]";
  if (index < step) return "text-[var(--accent-3)] hover:bg-[rgba(52,211,196,0.06)]";
  return "cursor-default text-[var(--muted)]";
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
      return <StructureStep playStyle={props.playStyle} resultMode={props.resultMode} onPlayStyleChange={props.onPlayStyleChange} onResultModeChange={props.onResultModeChange} />;
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
          mode={props.seedingMode}
          candidates={props.customSeedEntries}
          loading={props.customSeedLoading}
          draggingCandidateId={props.draggingSeedCandidateId}
          onModeChange={props.onSeedingModeChange}
          onDragStart={props.onSeedDragStart}
          onDragEnd={props.onSeedDragEnd}
          onDrop={props.onSeedDrop}
        />
      );
    case 4:
      return <AccessStep audienceMode={props.audienceMode} onAudienceModeChange={props.onAudienceModeChange} />;
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
          audienceMode={props.audienceMode}
          onTitleChange={props.onTitleChange}
        />
      );
  }
}
