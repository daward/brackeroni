"use client";

import { CandidateManagerPanel } from "@/components/pools/candidates";
import type { DraftCandidateManagerProps } from "../types";

export function DraftCandidateManager({ poolId, linkedPool, isPublishedTournament, entrants, isActionPending }: DraftCandidateManagerProps) {
  const {
    linkedPoolCandidates,
    candidateDraft,
    isCandidateEditorOpen,
    isEditingCandidate,
    imageSuggestions,
    imageSuggestionLoading,
    removingCandidateId,
    updateCandidateDraft,
    openCandidateCreator,
    handleImportCandidatesIntoPool,
    handleCandidateEditSubmit,
    handleCreateCandidateInPool,
    closeCandidateEditor,
    handleSuggestImages,
    selectSuggestedImage,
    openCandidateEditor,
    handleRemoveCandidateFromPool,
  } = entrants;

  return (
    <CandidateManagerPanel
      collection={{
        candidates: linkedPoolCandidates,
        hasNextPage: false,
        isLoadingMore: false,
        loadMore: null,
      }}
      editor={{
        isOpen: isCandidateEditorOpen,
        isEditing: isEditingCandidate,
        draft: candidateDraft,
        imageSuggestions,
        imageSuggestionLoading,
        isCreatePending: isActionPending(`create-candidate:${poolId}`),
        isSavePending: isActionPending(`save-candidate:${poolId}`),
        onDraftChange: (field, value) => updateCandidateDraft(poolId, field, value),
        onSubmit: () => (isEditingCandidate ? handleCandidateEditSubmit(poolId) : handleCreateCandidateInPool(poolId)),
        onClose: () => closeCandidateEditor(poolId),
        onSuggestImages: () => handleSuggestImages(poolId),
        onClearImage: () => selectSuggestedImage(poolId, ""),
        onSelectSuggestedImage: (url) => selectSuggestedImage(poolId, url),
      }}
      actions={{
        onCreate: () => openCandidateCreator(poolId),
        onImport: () =>
          handleImportCandidatesIntoPool({
            id: poolId,
            name: linkedPool?.name || "Selected Pool",
          }),
        onEdit: (candidate) => openCandidateEditor(poolId, candidate),
        onRemove: (candidate) => handleRemoveCandidateFromPool(poolId, candidate),
        removingCandidateId,
      }}
      tagManagement={{ showControl: false }}
      view={{
        readOnly: isPublishedTournament,
        listHeading: "In This Bracket",
        listEmptyMessage: "No entrants in this bracket yet.",
      }}
    />
  );
}
