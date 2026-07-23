"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listTournamentEntries,
  updateTournamentEntries
} from "@/lib/client-api/create-workspace";
import {
  addEmptySubBracket,
  assignEntryToGroup,
  buildMoveTargets,
  buildSeedingGroups,
  createEmptySubBracketId,
  createSeedingStructure,
  normalizeSeedingStructure,
  removeSubBracket,
  updateSubBracketName
} from "@/components/seeding-draft";

let emptySlotCounter = 0;

function createEmptySlot(playInSeed, playInSlot = 0) {
  emptySlotCounter += 1;

  return {
    id: `empty-slot-${emptySlotCounter}`,
    seed: playInSeed,
    subSeed: playInSlot,
    finalRank: null,
    candidateId: null,
    candidateName: "Empty play-in slot",
    candidateDescription: "",
    candidateImageUrl: null,
    isEmptySlot: true
  };
}

function normalizeSeedingEntries(entries) {
  return [...entries].map((entry) => ({
    ...entry,
    subSeed: Number(entry.subSeed || 0),
    isEmptySlot: Boolean(entry.isEmptySlot)
  }));
}

function hydrateSeedingEntries(entries) {
  return normalizeSeedingEntries((entries || []).map((entry) => ({
    ...entry,
    isEmptySlot: false
  })));
}

function validateSeedingEntries(entries, structure = createSeedingStructure()) {
  const issues = [];
  const groups = buildSeedingGroups(entries, structure);
  const localPlayInIds = new Set();

  groups.forEach((group) => {
    group.entries.forEach(({ entry, isLocalPlayInSlot }) => {
      if (isLocalPlayInSlot) {
        localPlayInIds.add(entry.id);
      }
    });
  });

  entries.forEach((entry) => {
    const normalizedSubSeed = Number(entry.subSeed || 0);

    if (entry.isEmptySlot) {
      issues.push("empty-slot");
    }

    if (normalizedSubSeed > 0 && !localPlayInIds.has(entry.id)) {
      issues.push("orphan-play-in");
      issues.push("split-play-in");
    }

    if (!localPlayInIds.has(entry.id) && !entry.isEmptySlot && normalizedSubSeed !== 0) {
      issues.push("invalid-subseed");
    }
  });

  for (const group of groups) {
    for (let index = 0; index < group.entries.length; index += 1) {
      const current = group.entries[index];
      const next = group.entries[index + 1];

      if (!current?.isLocalPlayInSlot) {
        continue;
      }

      if (!next?.isLocalPlayInSlot) {
        issues.push("malformed-play-in");
        continue;
      }

      index += 1;
    }
  }

  return {
    isValidForSave: issues.length === 0,
    hasEmptySlot: issues.includes("empty-slot"),
    issues
  };
}

function buildCanonicalSeedingPayload(entries, structure) {
  const groups = buildSeedingGroups(entries, structure);
  const payload = [];
  let nextSeed = 1;

  groups.forEach((group) => {
    for (let index = 0; index < group.entries.length; index += 1) {
      const current = group.entries[index];
      const next = group.entries[index + 1];

      if (!current || current.entry.isEmptySlot) {
        continue;
      }

      if (current.isLocalPlayInSlot && next?.isLocalPlayInSlot) {
        if (!next.entry.isEmptySlot) {
          payload.push({
            id: current.entry.id,
            seed: nextSeed,
            subSeed: 0
          });
          payload.push({
            id: next.entry.id,
            seed: nextSeed,
            subSeed: 1
          });
        }

        nextSeed += 1;
        index += 1;
        continue;
      }

      payload.push({
        id: current.entry.id,
        seed: nextSeed,
        subSeed: 0
      });
      nextSeed += 1;
    }
  });

  return payload;
}

function buildSeedingSnapshot(entries, structure) {
  const normalizedEntries = buildCanonicalSeedingPayload(entries, structure);
  const normalizedStructure = normalizeSeedingStructure(structure, normalizedEntries);
  const sortedEntryBrackets = Object.fromEntries(
    Object.entries(normalizedStructure.entryBrackets || {}).sort(([leftId], [rightId]) =>
      leftId.localeCompare(rightId)
    )
  );

  return JSON.stringify({
    entries: normalizedEntries,
    structure: {
      subBrackets: normalizedStructure.subBrackets,
      entryBrackets: sortedEntryBrackets
    }
  });
}

function togglePlayInEntries(currentEntries, firstEntryId, secondEntryId) {
  if (!firstEntryId || !secondEntryId || firstEntryId === secondEntryId) {
    return currentEntries;
  }

  const firstEntry = currentEntries.find((entry) => entry.id === firstEntryId);
  if (!firstEntry) {
    return currentEntries;
  }

  return normalizeSeedingEntries(currentEntries.map((entry) => {
    if (entry.id === firstEntryId) {
      return {
        ...entry,
        seed: firstEntry.seed,
        subSeed: 0,
        isEmptySlot: false
      };
    }

    if (entry.id === secondEntryId) {
      return {
        ...entry,
        seed: firstEntry.seed,
        subSeed: 1,
        isEmptySlot: false
      };
    }

    return entry;
  }));
}

function removeFromPlayInEntries(currentEntries, entryId, partnerEntryId) {
  if (!entryId || !partnerEntryId || entryId === partnerEntryId) {
    return currentEntries;
  }

  const next = currentEntries.map((entry) => ({ ...entry }));
  const targetIndex = next.findIndex((entry) => entry.id === entryId);
  const partnerIndex = next.findIndex((entry) => entry.id === partnerEntryId);

  if (targetIndex < 0 || partnerIndex < 0) {
    return currentEntries;
  }

  const target = next[targetIndex];
  const partner = next[partnerIndex];

  if (!target || !partner) {
    return currentEntries;
  }

  const pairSeed = target.seed;

  if (target.isEmptySlot || partner.isEmptySlot) {
    return normalizeSeedingEntries(next
      .filter((entry) => !(entry.isEmptySlot && entry.seed === pairSeed))
      .map((entry) => ({
        ...entry,
        subSeed: entry.seed === pairSeed ? 0 : entry.subSeed || 0
      })));
  }

  const emptySlot = createEmptySlot(target.seed, Number(target.subSeed || 0));
  const removed = {
    ...target,
    subSeed: 0,
    isEmptySlot: false
  };
  const remainingEntries = next.filter((entry) => entry.id !== entryId);
  const emptyInsertIndex = targetIndex;

  remainingEntries.splice(emptyInsertIndex, 0, emptySlot);
  const partnerIndexAfterInsert = remainingEntries.findIndex((entry) => entry.id === partnerEntryId);

  if (partnerIndexAfterInsert < 0) {
    return currentEntries;
  }

  remainingEntries.splice(partnerIndexAfterInsert + 1, 0, removed);

  return normalizeSeedingEntries(remainingEntries);
}

function moveEntryToIndex(entries, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= entries.length || toIndex > entries.length) {
    return entries;
  }

  const next = [...entries].map((entry) => ({ ...entry }));
  const movedEntry = next[fromIndex];
  const targetEntry = next[toIndex];

  if (!movedEntry || movedEntry.isEmptySlot) {
    return entries;
  }

  if (targetEntry?.isEmptySlot) {
    const [moved] = next.splice(fromIndex, 1);
    const adjustedTargetIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    const emptySlot = next[adjustedTargetIndex];

    if (!emptySlot?.isEmptySlot) {
      return entries;
    }

    next.splice(adjustedTargetIndex, 1, {
      ...moved,
      seed: emptySlot.seed,
      subSeed: emptySlot.subSeed || 0,
      isEmptySlot: false
    });

    return normalizeSeedingEntries(next);
  }

  const [moved] = next.splice(fromIndex, 1);
  const adjustedTargetIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(adjustedTargetIndex, 0, {
    ...moved,
    subSeed: 0
  });
  return normalizeSeedingEntries(next);
}

function togglePlayInAtIndexEntries(currentEntries, index) {
  if (index < 0 || index >= currentEntries.length - 1) {
    return currentEntries;
  }

  const currentEntry = currentEntries[index];
  const nextEntry = currentEntries[index + 1];

  if (!currentEntry || !nextEntry || currentEntry.isEmptySlot || nextEntry.isEmptySlot) {
    return currentEntries;
  }

  if (currentEntry.seed === nextEntry.seed) {
    return currentEntries;
  }

  return togglePlayInEntries(currentEntries, currentEntry.id, nextEntry.id);
}

function removeFromPlayInAtIndexEntries(currentEntries, index) {
  if (index < 0 || index >= currentEntries.length) {
    return currentEntries;
  }

  const target = currentEntries[index];
  const previous = currentEntries[index - 1];
  const next = currentEntries[index + 1];

  if (!target) {
    return currentEntries;
  }

  const partner = previous?.seed === target.seed ? previous : next?.seed === target.seed ? next : null;
  if (!partner) {
    return currentEntries;
  }

  return removeFromPlayInEntries(currentEntries, target.id, partner.id);
}

function getSeedingDraftStorage(tournamentId) {
  if (!tournamentId || typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage;
  if (!storage) {
    return null;
  }

  return {
    key: `brackeroni.seeding-draft:${tournamentId}`,
    storage
  };
}

function readLocalSeedingDraft(tournamentId) {
  const target = getSeedingDraftStorage(tournamentId);

  if (!target) {
    return null;
  }

  try {
    const raw = target.storage.getItem(target.key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      snapshot: typeof parsed.snapshot === "string" ? parsed.snapshot : "",
      payload: Array.isArray(parsed.payload) ? parsed.payload : [],
      structure: parsed.structure && typeof parsed.structure === "object" ? parsed.structure : {}
    };
  } catch {
    return null;
  }
}

function writeLocalSeedingDraft(tournamentId, draft) {
  const target = getSeedingDraftStorage(tournamentId);

  if (!target) {
    return;
  }

  try {
    target.storage.setItem(target.key, JSON.stringify(draft));
  } catch {
    // Ignore storage failures.
  }
}

function clearLocalSeedingDraft(tournamentId) {
  const target = getSeedingDraftStorage(tournamentId);

  if (!target) {
    return;
  }

  try {
    target.storage.removeItem(target.key);
  } catch {
    // Ignore storage failures.
  }
}

function hydrateEntriesFromDraftPayload(serverEntries, draftPayload) {
  if (!Array.isArray(serverEntries) || !Array.isArray(draftPayload) || draftPayload.length === 0) {
    return serverEntries;
  }

  const entryById = new Map(serverEntries.map((entry) => [entry.id, entry]));
  const restored = [];
  const usedIds = new Set();

  draftPayload.forEach((entry) => {
    if (!entry || typeof entry.id !== "string") {
      return;
    }

    const serverEntry = entryById.get(entry.id);
    if (!serverEntry) {
      return;
    }

    restored.push({
      ...serverEntry,
      seed: Number.isInteger(entry.seed) ? entry.seed : serverEntry.seed,
      subSeed: Number.isInteger(entry.subSeed) ? entry.subSeed : serverEntry.subSeed || 0
    });
    usedIds.add(entry.id);
  });

  serverEntries.forEach((entry) => {
    if (!usedIds.has(entry.id)) {
      restored.push(entry);
    }
  });

  return restored;
}

export const __seedingTestUtils = {
  buildSeedingSnapshot,
  buildCanonicalSeedingPayload,
  createEmptySlot,
  hydrateSeedingEntries,
  moveEntryToIndex,
  normalizeSeedingEntries,
  removeFromPlayInAtIndexEntries,
  removeFromPlayInEntries,
  togglePlayInAtIndexEntries,
  togglePlayInEntries,
  validateSeedingEntries
};

export function useSeedingActions({ setErrorMessage, setSuccessMessage, loadWorkspace }) {
  const [seedingTournament, setSeedingTournament] = useState(null);
  const [seedingEntries, setSeedingEntries] = useState([]);
  const [seedingStructure, setSeedingStructure] = useState(createSeedingStructure);
  const [collapsedSubBrackets, setCollapsedSubBrackets] = useState({});
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [savingSeeding, setSavingSeeding] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState(null);
  const [seedingDraftTournamentId, setSeedingDraftTournamentId] = useState(null);
  const [hasSeedingDraft, setHasSeedingDraft] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [changeVersion, setChangeVersion] = useState(0);
  const [lastSavedSeedingSnapshot, setLastSavedSeedingSnapshot] = useState("");
  const [seedingSaveError, setSeedingSaveError] = useState("");
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(null);
  const blockedSnapshotRef = useRef("");
  const isMountedRef = useRef(true);

  const baseSeedingGroups = useMemo(
    () => buildSeedingGroups(seedingEntries, seedingStructure),
    [seedingEntries, seedingStructure]
  );
  const seedingGroups = useMemo(
    () =>
      baseSeedingGroups.map((group) => ({
        ...group,
        isCollapsed: group.id === "__root__" ? false : Boolean(collapsedSubBrackets[group.id])
      })),
    [baseSeedingGroups, collapsedSubBrackets]
  );
  const seedingMoveTargets = useMemo(
    () => buildMoveTargets(seedingGroups),
    [seedingGroups]
  );
  const seedingSavePayload = useMemo(
    () =>
      buildCanonicalSeedingPayload(seedingEntries, seedingStructure),
    [seedingEntries]
  );
  const seedingSnapshot = useMemo(
    () => buildSeedingSnapshot(seedingEntries, seedingStructure),
    [seedingEntries, seedingStructure]
  );
  const seedingValidation = useMemo(
    () => validateSeedingEntries(seedingEntries, seedingStructure),
    [seedingEntries, seedingStructure]
  );
  const seedingHasUnsavedChanges = seedingSnapshot !== lastSavedSeedingSnapshot;
  const seedingAutosaveState = savingSeeding
    ? "saving"
    : !seedingValidation.isValidForSave
      ? "invalid"
      : seedingSaveError && seedingHasUnsavedChanges
        ? "error"
        : seedingHasUnsavedChanges
          ? "pending"
          : "saved";

  function markDirty() {
    setSeedingSaveError("");
    blockedSnapshotRef.current = "";
    setHasSeedingDraft(true);
    setIsDirty(true);
    setChangeVersion((current) => current + 1);
  }

  function applySeedingEntryMutation(mutator, structureMutator) {
    setSeedingEntries((currentEntries) => {
      const nextEntries = mutator(currentEntries);

      setSeedingStructure((currentStructure) => {
        const nextStructure = structureMutator
          ? structureMutator(currentStructure, nextEntries)
          : currentStructure;

        return normalizeSeedingStructure(nextStructure, nextEntries);
      });

      return nextEntries;
    });
    markDirty();
  }

  function applySeedingStructureMutation(mutator) {
    setSeedingStructure((currentStructure) => normalizeSeedingStructure(mutator(currentStructure), seedingEntries));
    markDirty();
  }

  async function openSeedingEditor(tournament) {
    setErrorMessage("");
    setSuccessMessage("");

    if (hasSeedingDraft && seedingDraftTournamentId === tournament.id) {
      setSeedingTournament(tournament);
      setDraggingEntryId(null);
      return;
    }

    setSeedingLoading(true);
    setSeedingTournament(tournament);
    setSeedingEntries([]);
    setSeedingStructure(createSeedingStructure());
    setCollapsedSubBrackets({});
    setIsDirty(false);
    setChangeVersion(0);
    setLastSavedSeedingSnapshot("");
    setSeedingSaveError("");

    try {
      const data = await listTournamentEntries(tournament.id);
      const serverEntries = hydrateSeedingEntries(data.items ?? []);
      const serverStructure = normalizeSeedingStructure(
        data.seedingStructure || createSeedingStructure(),
        serverEntries
      );
      const serverSnapshot = buildSeedingSnapshot(serverEntries, serverStructure);
      const localDraft = readLocalSeedingDraft(tournament.id);
      const shouldRecoverLocalDraft =
        localDraft &&
        localDraft.snapshot &&
        localDraft.snapshot !== serverSnapshot &&
        (localDraft.payload.length > 0 || (localDraft.structure?.subBrackets || []).length > 0);
      const recoveredEntries = shouldRecoverLocalDraft
        ? hydrateSeedingEntries(hydrateEntriesFromDraftPayload(serverEntries, localDraft.payload))
        : serverEntries;
      const recoveredStructure = shouldRecoverLocalDraft
        ? normalizeSeedingStructure(localDraft.structure || createSeedingStructure(), recoveredEntries)
        : serverStructure;
      const nextSnapshot = buildSeedingSnapshot(recoveredEntries, recoveredStructure);

      setSeedingEntries(recoveredEntries);
      setSeedingStructure(recoveredStructure);
      setSeedingDraftTournamentId(tournament.id);
      setHasSeedingDraft(true);
      setLastSavedSeedingSnapshot(shouldRecoverLocalDraft ? serverSnapshot : nextSnapshot);
      setIsDirty(shouldRecoverLocalDraft);
      setChangeVersion(shouldRecoverLocalDraft ? 1 : 0);
      setCollapsedSubBrackets({});

      if (shouldRecoverLocalDraft) {
        setSuccessMessage("Recovered unsaved seeding draft after refresh.");
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to load bracket seeding.");
      setSeedingTournament(null);
    } finally {
      setSeedingLoading(false);
    }
  }

  function closeSeedingEditor() {
    setSeedingTournament(null);
    setDraggingEntryId(null);
  }

  function moveSeedEntry(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    applySeedingEntryMutation((currentEntries) => moveEntryToIndex(currentEntries, fromIndex, toIndex));
  }

  function handleSeedDrop(targetIndex) {
    if (!draggingEntryId) {
      return;
    }

    const fromIndex = seedingEntries.findIndex((entry) => entry.id === draggingEntryId);
    moveSeedEntry(fromIndex, targetIndex);
    setDraggingEntryId(null);
  }

  function togglePlayInAtIndex(entryId, partnerEntryId) {
    applySeedingEntryMutation((currentEntries) => togglePlayInEntries(currentEntries, entryId, partnerEntryId));
  }

  function removeFromPlayInAtIndex(entryId, partnerEntryId) {
    applySeedingEntryMutation((currentEntries) => removeFromPlayInEntries(currentEntries, entryId, partnerEntryId));
  }

  function moveEntryToSubBracket(entryId, insertIndex) {
    applySeedingEntryMutation((currentEntries) => {
      const fromIndex = currentEntries.findIndex((entry) => entry.id === entryId);

      if (fromIndex < 0) {
        return currentEntries;
      }

      return moveEntryToIndex(currentEntries, fromIndex, insertIndex);
    });
  }

  function addSeedingSubBracket() {
    applySeedingStructureMutation((current) => addEmptySubBracket(current));
  }

  function renameSeedingSubBracket(groupId, name) {
    applySeedingStructureMutation((current) => updateSubBracketName(current, groupId, name));
  }

  function toggleSeedingSubBracket(groupId) {
    if (groupId === "__root__") {
      return;
    }

    setCollapsedSubBrackets((current) => ({
      ...current,
      [groupId]: !current[groupId]
    }));
  }

  function removeSeedingSubBracket(groupId) {
    applySeedingStructureMutation((current) => removeSubBracket(current, groupId));
    setCollapsedSubBrackets((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
  }

  function moveEntryIntoGroup(entryId, group, insertIndex) {
    if (!entryId) {
      return;
    }

    applySeedingEntryMutation(
      (currentEntries) => {
        const fromIndex = currentEntries.findIndex((entry) => entry.id === entryId);

        if (fromIndex < 0) {
          return currentEntries;
        }

        return moveEntryToIndex(currentEntries, fromIndex, insertIndex);
      },
      (currentStructure, nextEntries) => assignEntryToGroup(currentStructure, nextEntries, entryId, group.id)
    );
  }

  function handleSeedDropIntoGroup(group, insertIndex) {
    if (!draggingEntryId) {
      return;
    }

    moveEntryIntoGroup(draggingEntryId, group, insertIndex);
    setDraggingEntryId(null);
  }

  function createSubBracketAndMoveEntry(entryId) {
    if (!seedingEntries.some((entry) => entry.id === entryId)) {
      return;
    }

    const nextId = createEmptySubBracketId();
    applySeedingStructureMutation((currentStructure) =>
      assignEntryToGroup(
        updateSubBracketName(addEmptySubBracket(currentStructure, nextId), nextId, "New sub-bracket"),
        seedingEntries,
        entryId,
        nextId
      )
    );
  }

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!seedingTournament || seedingLoading || !hasSeedingDraft) {
      return;
    }

    if (seedingSnapshot !== lastSavedSeedingSnapshot) {
      writeLocalSeedingDraft(seedingTournament.id, {
        snapshot: seedingSnapshot,
        payload: seedingSavePayload,
        structure: seedingStructure
      });
      return;
    }

    clearLocalSeedingDraft(seedingTournament.id);
  }, [
    hasSeedingDraft,
    lastSavedSeedingSnapshot,
    seedingLoading,
    seedingSavePayload,
    seedingSnapshot,
    seedingStructure,
    seedingTournament
  ]);

  useEffect(() => {
    if (!seedingTournament || seedingLoading || !isDirty || changeVersion === 0) {
      return;
    }

    if (!seedingValidation.isValidForSave) {
      queuedSaveRef.current = null;
      setSavingSeeding(false);
      return;
    }

    if (blockedSnapshotRef.current === seedingSnapshot) {
      return;
    }

    const runSave = async (job) => {
      saveInFlightRef.current = true;
      if (isMountedRef.current) {
        setSavingSeeding(true);
        setErrorMessage("");
        setSuccessMessage("");
      }

      try {
        console.log("[seeding autosave] request", {
          tournamentId: job.tournamentId,
          payload: job.payload,
          seedingStructure: job.structure
        });
        const data = await updateTournamentEntries(
          job.tournamentId,
          job.payload,
          job.structure
        );

        console.log("[seeding autosave] response", {
          tournamentId: job.tournamentId,
          items: data.items,
          seedingStructure: data.seedingStructure
        });

        if (!isMountedRef.current) {
          return;
        }

        const nextEntries = hydrateSeedingEntries(data.items ?? []);
        const nextStructure = normalizeSeedingStructure(
          data.seedingStructure || createSeedingStructure(),
          nextEntries
        );
        const nextSnapshot = buildSeedingSnapshot(nextEntries, nextStructure);
        const queuedJob = queuedSaveRef.current;
        const hasNewerQueuedSave = queuedJob && queuedJob.snapshot !== job.snapshot;

        if (!hasNewerQueuedSave) {
          blockedSnapshotRef.current = "";
          setSeedingEntries(nextEntries);
          setSeedingStructure(nextStructure);
          setLastSavedSeedingSnapshot(nextSnapshot);
          setSeedingSaveError("");
          setIsDirty(false);
          await loadWorkspace();
        }
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        blockedSnapshotRef.current = job.snapshot;
        setSeedingSaveError(error.message || "Failed to save bracket seeding.");
        setErrorMessage(error.message || "Failed to save bracket seeding.");
      } finally {
        const nextQueued = queuedSaveRef.current;

        if (nextQueued && nextQueued.snapshot !== job.snapshot) {
          queuedSaveRef.current = null;
          await runSave(nextQueued);
          return;
        }

        queuedSaveRef.current = null;
        saveInFlightRef.current = false;
        if (isMountedRef.current) {
          setSavingSeeding(false);
        }
      }
    };

    const timer = setTimeout(() => {
      const saveJob = {
        snapshot: seedingSnapshot,
        payload: seedingSavePayload,
        structure: seedingStructure,
        tournamentId: seedingTournament.id
      };

      if (saveInFlightRef.current) {
        queuedSaveRef.current = saveJob;
        return;
      }

      runSave(saveJob);
    }, 700);

    return () => clearTimeout(timer);
  }, [
    changeVersion,
    isDirty,
    loadWorkspace,
    seedingLoading,
    seedingSavePayload,
    seedingSnapshot,
    seedingStructure,
    seedingTournament,
    seedingValidation.isValidForSave,
    setErrorMessage,
    setSuccessMessage
  ]);

  function handleSeedingSubmit(event) {
    event.preventDefault();
  }

  return {
    closeSeedingEditor,
    createSubBracketAndMoveEntry,
    draggingEntryId,
    handleSeedDropIntoGroup,
    handleSeedDrop,
    handleSeedingSubmit,
    moveEntryIntoGroup,
    openSeedingEditor,
    moveEntryToSubBracket,
    removeFromPlayInAtIndex,
    removeSeedingSubBracket,
    seedingAutosaveState,
    seedingSaveError,
    savingSeeding,
    seedingEntries,
    seedingGroups,
    seedingLoading,
    seedingMoveTargets,
    seedingStructure,
    seedingTournament,
    addSeedingSubBracket,
    renameSeedingSubBracket,
    setDraggingEntryId,
    toggleSeedingSubBracket,
    togglePlayInAtIndex
  };
}
