"use client";

import { useState } from "react";
import { CandidateEditorForm } from "./candidate-editor-form";
import { CandidateCreationCards } from "./candidate-creation-cards";
import { CandidateList } from "./candidate-list";
import { CandidateListToolbar } from "./candidate-list-toolbar";
import { CandidateTagDrawer } from "./candidate-tag-drawer";
import { useCandidateTags } from "./use-candidate-tags";
import styles from "./candidate-manager-panel.module.css";
import type { CandidateManagerProps, PoolCandidate } from "../types";

export function CandidateManagerPanel({ collection, editor, actions, tagManagement, view }: CandidateManagerProps) {
  const { readOnly = false, showTopRule = true, listHeading = null, listEmptyMessage = "No candidates in this pool yet." } = view;
  const {
    showControl = true,
    openDrawerRequest = false,
    onDrawerRequestHandled,
    isRemoveTagPending,
    isRemoveLowValueTagsPending,
    onRemoveTag,
    onRemoveLowValueTags,
  } = tagManagement;
  const { onCreate, onImport, onEdit, onRemove, removingCandidateId = null } = actions;
  const [expandedReadOnlyCandidateId, setExpandedReadOnlyCandidateId] = useState<string | null>(null);
  const tags = useCandidateTags({
    candidates: collection.candidates,
    openDrawerRequest,
    onDrawerRequestHandled,
  });

  return (
    <>
      <div className={`${styles.panel} ${showTopRule ? styles.panelWithRule : ""}`}>
        <CandidateListToolbar
          list={{ heading: listHeading, activeFilter: tags.activeTagFilter }}
          tags={{
            enabled: showControl,
            count: tags.sortedTags.length,
            readOnly,
            onOpen: () => tags.setIsDrawerOpen(true),
          }}
        />
        <CandidateList
          collection={{
            candidates: tags.visibleCandidates,
            emptyMessage: listEmptyMessage,
            hasNextPage: collection.hasNextPage,
            isLoadingMore: collection.isLoadingMore,
            loadMore: collection.loadMore,
          }}
          interaction={{
            readOnly,
            activeTagFilter: tags.activeTagFilter,
            expandedCandidateId: expandedReadOnlyCandidateId,
            removingCandidateId,
            onCandidateActivate: (candidate: PoolCandidate) => {
              if (readOnly) {
                setExpandedReadOnlyCandidateId((current) => (current === candidate.id ? null : candidate.id));
                return;
              }

              onEdit(candidate);
            },
            onRemoveCandidate: onRemove,
          }}
        >
          {!readOnly ? <CandidateCreationCards actions={{ onCreate, onImport }} /> : null}
        </CandidateList>
      </div>
      <CandidateTagDrawer
        tags={{
          isOpen: tags.isDrawerOpen,
          sortedTags: tags.sortedTags,
          activeTagFilter: tags.activeTagFilter,
          lowValueThreshold: tags.lowValueThreshold,
          onClose: () => tags.setIsDrawerOpen(false),
          onActiveFilterChange: tags.setActiveFilter,
          onLowValueThresholdChange: tags.setLowValueThreshold,
        }}
        management={{
          readOnly,
          isRemoveTagPending,
          isRemoveLowValueTagsPending,
          onRemoveTag,
          onRemoveLowValueTags,
        }}
      />
      <CandidateEditorForm editor={{ ...editor, readOnly }} />
    </>
  );
}
