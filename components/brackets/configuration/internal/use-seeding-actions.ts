"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listTournamentEntries } from "@/lib/client-api/create-workspace";
import { createSeedingStructure, normalizeSeedingStructure } from "@/lib/brackets/seeding-draft";
import { moveEntryToIndex, removeFromPlayInAtIndexEntries, removeFromPlayInEntries, togglePlayInAtIndexEntries, togglePlayInEntries } from "@/lib/brackets/seeding-entry-actions";
import { buildCanonicalSeedingPayload, buildSeedingSnapshot, hydrateSeedingEntries, validateSeedingEntries } from "@/lib/brackets/seeding-entry-policy";
import type { SeedingEntryRecord, SeedingStructure } from "@/lib/brackets/types";
import type { SeedingAutosaveState, UseSeedingActionsOptions, UseSeedingActionsResult } from "../types";
import { clearLocalSeedingDraft, hydrateEntriesFromDraftPayload, readLocalSeedingDraft, writeLocalSeedingDraft } from "./seeding-local-draft";
import { useSeedingAutosave } from "./use-seeding-autosave";
import { useSeedingEditorState } from "./use-seeding-editor-state";

type Tournament = { id: string };
type ServerSeedingData = { items?: SeedingEntryRecord[]; seedingStructure?: SeedingStructure };

export const __seedingTestUtils = {
  buildSeedingSnapshot,
  buildCanonicalSeedingPayload,
  moveEntryToIndex,
  hydrateSeedingEntries,
  removeFromPlayInAtIndexEntries,
  removeFromPlayInEntries,
  togglePlayInAtIndexEntries,
  togglePlayInEntries,
  validateSeedingEntries,
};

export function useSeedingActions({ setErrorMessage, setSuccessMessage, loadWorkspace }: UseSeedingActionsOptions): UseSeedingActionsResult {
  const [seedingTournament, setSeedingTournament] = useState<Tournament | null>(null);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTournamentId, setDraftTournamentId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = useCallback(() => {
    setHasDraft(true);
    setIsDirty(true);
  }, []);
  const editor = useSeedingEditorState(markDirty);
  const payload = useMemo(() => buildCanonicalSeedingPayload(editor.seedingEntries, editor.seedingStructure), [editor.seedingEntries, editor.seedingStructure]);
  const snapshot = useMemo(() => buildSeedingSnapshot(editor.seedingEntries, editor.seedingStructure), [editor.seedingEntries, editor.seedingStructure]);
  const validation = useMemo(() => validateSeedingEntries(editor.seedingEntries, editor.seedingStructure), [editor.seedingEntries, editor.seedingStructure]);
  const hasUnsavedChanges = snapshot !== lastSavedSnapshot;
  const onSaveError = useCallback(
    (message: string) => {
      setErrorMessage(message);
    },
    [setErrorMessage],
  );
  const onSaving = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, [setErrorMessage, setSuccessMessage]);
  const onSaved = useCallback(
    async (response: unknown) => {
      const data = response as ServerSeedingData;
      const entries = hydrateSeedingEntries(data.items ?? []);
      const structure = normalizeSeedingStructure(data.seedingStructure ?? createSeedingStructure(), entries);
      editor.reset(entries, structure);
      setLastSavedSnapshot(buildSeedingSnapshot(entries, structure));
      setIsDirty(false);
      await loadWorkspace({ force: true });
    },
    [editor, loadWorkspace],
  );
  const { savingSeeding, seedingSaveError } = useSeedingAutosave({
    enabled: Boolean(seedingTournament && !seedingLoading && isDirty),
    valid: validation.isValidForSave,
    tournamentId: seedingTournament?.id ?? "",
    snapshot,
    payload,
    structure: editor.seedingStructure,
    onSaved,
    onError: onSaveError,
    onSaving,
  });

  useEffect(() => {
    if (!seedingTournament || seedingLoading || !hasDraft) return;
    if (hasUnsavedChanges) writeLocalSeedingDraft(seedingTournament.id, { snapshot, payload, structure: editor.seedingStructure });
    else clearLocalSeedingDraft(seedingTournament.id);
  }, [editor.seedingStructure, hasDraft, hasUnsavedChanges, payload, seedingLoading, seedingTournament, snapshot]);

  const openSeedingEditor = useCallback(
    async (tournament: Tournament) => {
      setErrorMessage("");
      setSuccessMessage("");
      if (hasDraft && draftTournamentId === tournament.id) {
        setSeedingTournament(tournament);
        editor.setDraggingEntryId(null);
        return;
      }
      setSeedingLoading(true);
      setSeedingTournament(tournament);
      setLastSavedSnapshot("");
      setIsDirty(false);
      try {
        const data = (await listTournamentEntries(tournament.id)) as ServerSeedingData;
        const serverEntries = hydrateSeedingEntries(data.items ?? []);
        const serverStructure = normalizeSeedingStructure(data.seedingStructure ?? createSeedingStructure(), serverEntries);
        const serverSnapshot = buildSeedingSnapshot(serverEntries, serverStructure);
        const local = readLocalSeedingDraft(tournament.id);
        const recover = Boolean(local?.snapshot && local.snapshot !== serverSnapshot && (local.payload.length || local.structure.subBrackets.length));
        const entries = recover && local ? hydrateEntriesFromDraftPayload(serverEntries, local.payload) : serverEntries;
        const structure = recover && local ? normalizeSeedingStructure(local.structure, entries) : serverStructure;
        editor.reset(entries, structure);
        setDraftTournamentId(tournament.id);
        setHasDraft(true);
        setLastSavedSnapshot(recover ? serverSnapshot : buildSeedingSnapshot(entries, structure));
        setIsDirty(recover);
        if (recover) setSuccessMessage("Recovered unsaved seeding draft after refresh.");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load bracket seeding.");
        setSeedingTournament(null);
      } finally {
        setSeedingLoading(false);
      }
    },
    [draftTournamentId, editor, hasDraft, setErrorMessage, setSuccessMessage],
  );
  const handleSeedDropIntoGroup = useCallback(
    (group: { id: string }, insertIndex: number) => {
      if (!editor.draggingEntryId) return;
      editor.moveEntryIntoGroup(editor.draggingEntryId, group, insertIndex);
      editor.setDraggingEntryId(null);
    },
    [editor],
  );
  const autosaveState = getAutosaveState({
    saving: savingSeeding,
    valid: validation.isValidForSave,
    hasError: Boolean(seedingSaveError && hasUnsavedChanges),
    hasUnsavedChanges,
  });

  return {
    closeSeedingEditor: () => {
      setSeedingTournament(null);
      editor.setDraggingEntryId(null);
    },
    createSubBracketAndMoveEntry: editor.createSubBracketAndMoveEntry,
    draggingEntryId: editor.draggingEntryId,
    handleSeedDropIntoGroup,
    handleSeedingSubmit: (event: { preventDefault(): void }) => event.preventDefault(),
    moveEntryIntoGroup: editor.moveEntryIntoGroup,
    openSeedingEditor,
    moveEntryToSubBracket: editor.moveEntryToSubBracket,
    removeFromPlayInAtIndex: editor.removeFromPlayInAtIndex,
    removeSeedingSubBracket: editor.removeSeedingSubBracket,
    seedingAutosaveState: autosaveState,
    seedingSaveError,
    seedingGroups: editor.seedingGroups,
    seedingLoading,
    seedingMoveTargets: editor.seedingMoveTargets,
    seedingStructure: editor.seedingStructure,
    seedingTournament,
    addSeedingSubBracket: editor.addSeedingSubBracket,
    renameSeedingSubBracket: editor.renameSeedingSubBracket,
    setDraggingEntryId: editor.setDraggingEntryId,
    toggleSeedingSubBracket: editor.toggleSeedingSubBracket,
    togglePlayInAtIndex: editor.togglePlayInAtIndex,
  };
}

function getAutosaveState({
  saving,
  valid,
  hasError,
  hasUnsavedChanges,
}: {
  saving: boolean;
  valid: boolean;
  hasError: boolean;
  hasUnsavedChanges: boolean;
}): SeedingAutosaveState {
  if (saving) return "saving";
  if (!valid) return "invalid";
  if (hasError) return "error";
  if (hasUnsavedChanges) return "pending";
  return "idle";
}
