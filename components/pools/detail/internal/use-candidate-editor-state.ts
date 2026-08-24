"use client";

import { useCallback, useState } from "react";
import type { CandidateDraft, PoolCandidate } from "@/components/pools/candidates";

export type CandidateEditorState = { id: string | null };

const emptyDraft: CandidateDraft = { name: "", description: "", imageUrl: "", tagsText: "" };

function toDraft(candidate: PoolCandidate): CandidateDraft {
  return {
    name: candidate.name,
    description: candidate.description || "",
    imageUrl: candidate.imageUrl || "",
    tagsText: (candidate.tags || []).join(", "),
  };
}

export function useCandidateEditorState() {
  const [candidateDraft, setCandidateDraft] = useState<CandidateDraft>(emptyDraft);
  const [candidateEditor, setCandidateEditor] = useState<CandidateEditorState | null>(null);
  const openCandidateCreator = useCallback(() => {
    setCandidateDraft(emptyDraft);
    setCandidateEditor({ id: null });
  }, []);
  const openCandidateEditor = useCallback((candidate: PoolCandidate) => {
    setCandidateDraft(toDraft(candidate));
    setCandidateEditor({ id: candidate.id });
  }, []);

  return { candidateDraft, candidateEditor, openCandidateCreator, openCandidateEditor, setCandidateDraft, setCandidateEditor };
}
