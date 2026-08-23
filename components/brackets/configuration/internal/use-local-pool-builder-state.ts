"use client";

import { useEffect, useState } from "react";
import type { ImageSuggestion } from "@/components/pools/candidates/types";
import { parseCandidateTagText } from "@/lib/candidate-tags";
import { suggestImages } from "@/lib/client-api/create-workspace";
import type { PoolCandidate, PoolVisibility } from "@/lib/pools/types";

export type LocalCandidateDraft = {
  name: string;
  description: string;
  imageUrl: string;
  tagsText: string;
};

type LocalPoolBuilderStateParams = {
  poolName: string;
  candidates: PoolCandidate[];
  onPoolNameChange: (name: string) => void;
  onCandidatesChange: (candidates: PoolCandidate[]) => void;
};

const emptyCandidate: LocalCandidateDraft = {
  name: "",
  description: "",
  imageUrl: "",
  tagsText: "",
};

export function useLocalPoolBuilderState({ poolName, candidates, onPoolNameChange, onCandidatesChange }: LocalPoolBuilderStateParams) {
  const [poolDescription, setPoolDescription] = useState("");
  const [poolVisibility, setPoolVisibility] = useState<PoolVisibility>("private");
  const [candidateDraft, setCandidateDraft] = useState<LocalCandidateDraft>(emptyCandidate);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestion[]>([]);
  const [imageSuggestionLoading, setImageSuggestionLoading] = useState(false);

  useEffect(() => {
    const candidateName = candidateDraft.name.trim();

    if (!isEditorOpen || candidateName.length < 2) {
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setImageSuggestionLoading(true);
      try {
        const data = await suggestImages(candidateName);
        if (active) {
          setImageSuggestions(data.items || []);
        }
      } catch {
        if (active) {
          setImageSuggestions([]);
        }
      } finally {
        if (active) {
          setImageSuggestionLoading(false);
        }
      }
    }, 700);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [candidateDraft.name, isEditorOpen]);

  function closeEditor() {
    setCandidateDraft(emptyCandidate);
    setEditingCandidateId(null);
    setIsEditorOpen(false);
  }

  function saveCandidate() {
    const name = candidateDraft.name.trim();
    if (!name) return;

    const item = {
      id: editingCandidateId || `draft-${crypto.randomUUID()}`,
      name,
      description: candidateDraft.description.trim() || null,
      imageUrl: candidateDraft.imageUrl.trim() || null,
      tags: parseCandidateTagText(candidateDraft.tagsText),
    };

    if (editingCandidateId) {
      onCandidatesChange(candidates.map((candidate) => (candidate.id === editingCandidateId ? item : candidate)));
    } else {
      onCandidatesChange([...candidates, item]);
    }
    closeEditor();
  }

  async function handleSuggestImages() {
    if (candidateDraft.name.trim().length < 2) return;
    setImageSuggestionLoading(true);
    try {
      const data = await suggestImages(candidateDraft.name.trim());
      setImageSuggestions(data.items || []);
    } finally {
      setImageSuggestionLoading(false);
    }
  }

  function importCandidates() {
    const existingNames = new Set(candidates.map((candidate) => candidate.name.toLowerCase()));
    const additions = importText
      .split(/\r?\n|,/)
      .map((name) => name.trim())
      .filter((name) => name && !existingNames.has(name.toLowerCase()))
      .map((name) => ({
        id: `draft-${crypto.randomUUID()}`,
        name,
        description: null,
        imageUrl: null,
        tags: [],
      }));

    onCandidatesChange([...candidates, ...additions]);
    setImportText("");
    setIsImportOpen(false);
  }

  const draftPool = {
    name: poolName,
    description: poolDescription,
    visibility: poolVisibility,
  };
  const pool = {
    name: poolName || "Untitled Pool",
    candidateCount: candidates.length,
    visibility: poolVisibility,
  };
  const editor = {
    isOpen: isEditorOpen,
    isEditing: Boolean(editingCandidateId),
    draft: candidateDraft,
    imageSuggestions,
    imageSuggestionLoading,
    description: "",
    onDraftChange: (field: keyof LocalCandidateDraft, value: string) => setCandidateDraft((current) => ({ ...current, [field]: value })),
    onSubmit: saveCandidate,
    onClose: closeEditor,
    onSuggestImages: handleSuggestImages,
    onClearImage: () => setCandidateDraft((current) => ({ ...current, imageUrl: "" })),
    onSelectSuggestedImage: (imageUrl: string) => setCandidateDraft((current) => ({ ...current, imageUrl })),
  };
  const actions = {
    onCreate: () => {
      setCandidateDraft(emptyCandidate);
      setEditingCandidateId(null);
      setImageSuggestions([]);
      setIsEditorOpen(true);
    },
    onImport: () => setIsImportOpen(true),
    onEdit: (candidate: PoolCandidate) => {
      setCandidateDraft({
        name: candidate.name,
        description: candidate.description || "",
        imageUrl: candidate.imageUrl || "",
        tagsText: (candidate.tags || []).join(", "),
      });
      setEditingCandidateId(candidate.id);
      setImageSuggestions([]);
      setIsEditorOpen(true);
    },
    onRemove: (candidate: PoolCandidate) => onCandidatesChange(candidates.filter((item) => item.id !== candidate.id)),
  };

  return {
    pool,
    draftPool,
    editor,
    actions,
    isImportOpen,
    importText,
    setImportText,
    importCandidates,
    closeImport: () => setIsImportOpen(false),
    updatePoolDraft: (patch: Partial<typeof draftPool>) => {
      if (typeof patch.name === "string") onPoolNameChange(patch.name);
      if (typeof patch.description === "string") setPoolDescription(patch.description);
      if (typeof patch.visibility === "string") setPoolVisibility(patch.visibility);
    },
  };
}
