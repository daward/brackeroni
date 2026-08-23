"use client";

import { CandidateManagerPanel } from "@/components/pools/candidates";
import { PoolManagementPanel } from "@/components/pools/shared";
import type { PoolCandidate } from "@/lib/pools/types";
import { LocalPoolImportPanel } from "./local-pool-import-panel";
import { useLocalPoolBuilderState } from "./use-local-pool-builder-state";

type LocalPoolBuilderProps = {
  poolName: string;
  onPoolNameChange: (name: string) => void;
  candidates: PoolCandidate[];
  onCandidatesChange: (candidates: PoolCandidate[]) => void;
};

export function LocalPoolBuilder({ poolName, onPoolNameChange, candidates, onCandidatesChange }: LocalPoolBuilderProps) {
  const builder = useLocalPoolBuilderState({
    poolName,
    candidates,
    onPoolNameChange,
    onCandidatesChange,
  });

  return (
    <PoolManagementPanel
      pool={builder.pool}
      draft={builder.draftPool}
      presentation={{ title: { placeholder: "Name this pool" }, summary: { visibility: false } }}
      onDraftChange={builder.updatePoolDraft}
      className="space-y-5 py-5"
    >
      <p className="text-sm leading-6 text-[var(--muted)]">Build this pool here. It will be saved with the bracket only when you finish setup.</p>
      {builder.isImportOpen ? (
        <LocalPoolImportPanel
          importText={builder.importText}
          onImportTextChange={builder.setImportText}
          onImportCandidates={builder.importCandidates}
          onCancel={builder.closeImport}
        />
      ) : null}
      <CandidateManagerPanel
        collection={{ candidates, hasNextPage: false, isLoadingMore: false, loadMore: null }}
        editor={builder.editor}
        actions={builder.actions}
        tagManagement={{ showControl: false }}
        view={{
          listHeading: "Candidates in this new pool",
          listEmptyMessage: "Add candidates individually or import a list to build this pool.",
        }}
      />
    </PoolManagementPanel>
  );
}
