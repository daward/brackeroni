"use client";

import type { BracketCreationWizardProps } from "../types";
import { useBracketCreationWizardState } from "./use-bracket-creation-wizard-state";
import { WizardLayout } from "./wizard-layout";

export function BracketCreationWizard({
  pools,
  creating,
  onCancel,
  onCreate,
  onCreatePoolWorkspace,
  initialPoolId = "",
  initialConfig = null,
  initialStep = 0,
  onStepChange,
  fullPage = false,
}: BracketCreationWizardProps) {
  const wizard = useBracketCreationWizardState({
    pools,
    initialPoolId,
    initialConfig,
    initialStep,
    onStepChange,
    onCancel,
    onCreate,
  });

  return (
    <WizardLayout
      fullPage={fullPage}
      step={wizard.step}
      sourceMode={wizard.sourceMode}
      sourcePoolId={wizard.sourcePoolId}
      pools={wizard.pools}
      hasMorePools={wizard.hasMorePools}
      loadingMorePools={wizard.loadingMorePools}
      poolLoadSentinelRef={wizard.poolLoadSentinelRef}
      poolName={wizard.poolName}
      candidates={wizard.candidates}
      playStyle={wizard.playStyle}
      resultMode={wizard.resultMode}
      advancementMode={wizard.advancementMode}
      tieBreakMode={wizard.tieBreakMode}
      seedingMode={wizard.seedingMode}
      customSeedEntries={wizard.customSeedEntries}
      customSeedLoading={wizard.customSeedLoading}
      draggingSeedCandidateId={wizard.draggingSeedCandidateId}
      audienceMode={wizard.audienceMode}
      title={wizard.title}
      selectedName={wizard.selectedName}
      selectedCount={wizard.selectedCount}
      error={wizard.error}
      creating={creating}
      onCancel={onCancel}
      onStepChange={wizard.setStep}
      onSelectPool={wizard.selectPool}
      onCreatePoolWorkspace={onCreatePoolWorkspace}
      onSourceModeChange={wizard.setSourceMode}
      onPoolNameChange={wizard.setPoolName}
      onCandidatesChange={wizard.setCandidates}
      onPlayStyleChange={wizard.setPlayStyle}
      onResultModeChange={wizard.setResultMode}
      onAdvancementModeChange={wizard.setAdvancementMode}
      onTieBreakModeChange={wizard.setTieBreakMode}
      onSeedingModeChange={wizard.chooseSeedingMode}
      onSeedDragStart={wizard.setDraggingSeedCandidateId}
      onSeedDragEnd={() => wizard.setDraggingSeedCandidateId(null)}
      onSeedDrop={(targetCandidateId) => {
        wizard.moveCustomSeedEntry(wizard.draggingSeedCandidateId, targetCandidateId);
        wizard.setDraggingSeedCandidateId(null);
      }}
      onAudienceModeChange={wizard.setAudienceMode}
      onTitleChange={wizard.setTitle}
      onBack={wizard.goBack}
      onNext={wizard.goNext}
      onCreate={wizard.handleCreate}
    />
  );
}
