"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceSectionTabs } from "@/components/navigation/workspace-section-tabs";
import {
  CandidateManagerPanel,
  type CandidateActions,
  type CandidateEditor,
  type CandidateManagerView,
  type CandidateTagManagement
} from "@/components/pools/candidates";
import { ToastMessages } from "@/components/shared";
import type { PoolDetailWorkspaceProps } from "../types";
import { PoolDetailActions } from "./pool-detail-actions";
import { PoolDetailHeader } from "./pool-detail-header";
import { usePoolDetail } from "./use-pool-detail";
import styles from "./pool-detail-workspace.module.css";

export function PoolDetailWorkspace({ initialPool }: PoolDetailWorkspaceProps) {
  const router = useRouter();
  const [tagRequest, setTagRequest] = useState(false);
  const detail = usePoolDetail({
    initialPool,
    onArchive: () => router.push("/pools"),
    onImportFallback: () => router.push(`/tools/import?poolId=${encodeURIComponent(initialPool.id)}&poolName=${encodeURIComponent(initialPool.name)}`)
  });
  const { pool } = detail;
  const readOnly = Boolean(pool.isReadOnly);
  const editor: CandidateEditor = {
    isOpen: Boolean(detail.candidateEditor),
    isEditing: Boolean(detail.candidateEditor?.id),
    draft: detail.candidateDraft,
    imageSuggestions: detail.imageSuggestions,
    imageSuggestionLoading: detail.isImageSuggestionLoading,
    isCreatePending: detail.isPending("create-candidate"),
    isSavePending: detail.isPending("save-candidate"),
    description: "Update the candidate and keep the full list in place behind the drawer.",
    onDraftChange: (field, value) => detail.setCandidateDraft((current) => ({ ...current, [field]: value })),
    onSubmit: detail.candidateEditor?.id ? detail.saveCandidate : detail.createCandidate,
    onClose: () => detail.setCandidateEditor(null),
    onSuggestImages: () => detail.suggestCandidateImages({ force: true }),
    onClearImage: () => detail.setCandidateDraft((current) => ({ ...current, imageUrl: "" })),
    onSelectSuggestedImage: (imageUrl) => detail.setCandidateDraft((current) => ({ ...current, imageUrl }))
  };
  const actions: CandidateActions = {
    onCreate: detail.openCandidateCreator,
    onImport: detail.continueImport,
    onEdit: detail.openCandidateEditor,
    onRemove: detail.removeCandidate,
    removingCandidateId: detail.candidateCollection.candidates.find((candidate) => detail.isPending(`remove-candidate:${candidate.id}`))?.id || null
  };
  const tagManagement: CandidateTagManagement = {
    showControl: false,
    openDrawerRequest: tagRequest,
    onDrawerRequestHandled: () => setTagRequest(false),
    onRemoveTag: detail.removeTag,
    onRemoveLowValueTags: detail.removeLowValueTags
  };
  const view: CandidateManagerView = {
    readOnly,
    showTopRule: false,
    listEmptyMessage: "No candidates in this pool yet. Add one or import a list to begin."
  };

  return (
    <div className={styles.workspace}>
      <ToastMessages errorMessage={detail.errorMessage} successMessage={detail.successMessage} />
      <WorkspaceSectionTabs activeView="pools" />
      <PoolDetailHeader pool={pool} draft={detail.poolDraft} readOnly={readOnly} onDraftChange={detail.setPoolDraft} onDraftCommit={detail.savePool}>
        {pool.candidateCount >= 2 ? <Link href={`/brackets/configuration?poolId=${pool.id}&step=structure`} className="ui-button ui-button-primary">Set up bracket</Link> : null}
        <PoolDetailActions
          pool={pool}
          readOnly={readOnly}
          isPending={detail.isPending}
          isMergeOpen={detail.isMergeOpen}
          mergePools={detail.mergePools}
          onViewTags={() => setTagRequest(true)}
          onCopyLink={detail.copyLink}
          onImport={detail.continueImport}
          onEnrich={detail.enrichCandidates}
          onFillMissingImages={detail.autoFillMissingImages}
          onOpenMerge={detail.openMerge}
          onMerge={detail.mergePool}
          onArchive={detail.archive}
        />
      </PoolDetailHeader>
      <section className="pool-detail-content">
        <CandidateManagerPanel collection={detail.candidateCollection} editor={editor} actions={actions} tagManagement={tagManagement} view={view} />
      </section>
    </div>
  );
}
