"use client";
import { useMemo, useState } from "react";
import type { SeedingStructure } from "@/lib/brackets/types";
import {
  addEmptySubBracket,
  assignEntryToGroup,
  buildMoveTargets,
  buildSeedingGroups,
  createEmptySubBracketId,
  createSeedingStructure,
  normalizeSeedingStructure,
  removeSubBracket,
  updateSubBracketName,
} from "@/lib/brackets/seeding-draft";
import { moveEntryToIndex, removeFromPlayInEntries, togglePlayInEntries } from "@/lib/brackets/seeding-entry-actions";
import type { SeedingEntry } from "@/lib/brackets/seeding-entry-policy";

export function useSeedingEditorState(onChange: () => void) {
  const [seedingEntries, setSeedingEntries] = useState<SeedingEntry[]>([]);
  const [seedingStructure, setSeedingStructure] = useState<SeedingStructure>(createSeedingStructure);
  const [collapsedSubBrackets, setCollapsedSubBrackets] = useState<Record<string, boolean>>({});
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
  const groups = useMemo(
    () => buildSeedingGroups(seedingEntries, seedingStructure).map((group) => ({ ...group, isCollapsed: group.id !== "__root__" && Boolean(collapsedSubBrackets[group.id]) })),
    [collapsedSubBrackets, seedingEntries, seedingStructure],
  );
  const moveTargets = useMemo(() => buildMoveTargets(groups), [groups]);
  const applyEntries = (mutator: (entries: SeedingEntry[]) => SeedingEntry[], structureMutator?: (structure: SeedingStructure, entries: SeedingEntry[]) => SeedingStructure) => {
    setSeedingEntries((current) => {
      const next = mutator(current);
      setSeedingStructure((structure) => normalizeSeedingStructure(structureMutator ? structureMutator(structure, next) : structure, next));
      return next;
    });
    onChange();
  };
  const applyStructure = (mutator: (structure: SeedingStructure) => SeedingStructure) => {
    setSeedingStructure((current) => normalizeSeedingStructure(mutator(current), seedingEntries));
    onChange();
  };
  return {
    seedingEntries,
    setSeedingEntries,
    seedingStructure,
    setSeedingStructure,
    draggingEntryId,
    setDraggingEntryId,
    seedingGroups: groups,
    seedingMoveTargets: moveTargets,
    reset(entries: SeedingEntry[], structure: SeedingStructure) {
      setSeedingEntries(entries);
      setSeedingStructure(structure);
      setCollapsedSubBrackets({});
      setDraggingEntryId(null);
    },
    moveSeedEntry(from: number, to: number) {
      applyEntries((entries) => moveEntryToIndex(entries, from, to));
    },
    togglePlayInAtIndex(entryId: string, partnerId: string) {
      applyEntries((entries) => togglePlayInEntries(entries, entryId, partnerId));
    },
    removeFromPlayInAtIndex(entryId: string, partnerId: string) {
      applyEntries((entries) => removeFromPlayInEntries(entries, entryId, partnerId));
    },
    moveEntryToSubBracket(entryId: string, insertIndex: number) {
      applyEntries((entries) =>
        moveEntryToIndex(
          entries,
          entries.findIndex((entry) => entry.id === entryId),
          insertIndex,
        ),
      );
    },
    addSeedingSubBracket() {
      applyStructure(addEmptySubBracket);
    },
    renameSeedingSubBracket(id: string, name: string) {
      applyStructure((structure) => updateSubBracketName(structure, id, name));
    },
    toggleSeedingSubBracket(id: string) {
      if (id !== "__root__") setCollapsedSubBrackets((current) => ({ ...current, [id]: !current[id] }));
    },
    removeSeedingSubBracket(id: string) {
      applyStructure((structure) => removeSubBracket(structure, id));
      setCollapsedSubBrackets((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    },
    moveEntryIntoGroup(entryId: string, group: { id: string }, insertIndex: number) {
      applyEntries(
        (entries) =>
          moveEntryToIndex(
            entries,
            entries.findIndex((entry) => entry.id === entryId),
            insertIndex,
          ),
        (structure, entries) => assignEntryToGroup(structure, entries, entryId, group.id),
      );
    },
    createSubBracketAndMoveEntry(entryId: string) {
      if (!seedingEntries.some((entry) => entry.id === entryId)) return;
      const id = createEmptySubBracketId();
      applyStructure((structure) => assignEntryToGroup(updateSubBracketName(addEmptySubBracket(structure, id), id, "New sub-bracket"), seedingEntries, entryId, id));
    },
  };
}
