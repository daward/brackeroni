"use client";

import { useState } from "react";
import {
  listTournamentEntries,
  updateTournamentEntries
} from "@/lib/client-api/create-workspace";

export function useSeedingActions({ setErrorMessage, setSuccessMessage, loadWorkspace }) {
  const [seedingTournament, setSeedingTournament] = useState(null);
  const [seedingEntries, setSeedingEntries] = useState([]);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [savingSeeding, setSavingSeeding] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState(null);

  async function openSeedingEditor(tournament) {
    setErrorMessage("");
    setSuccessMessage("");
    setSeedingLoading(true);
    setSeedingTournament(tournament);
    setSeedingEntries([]);

    try {
      const data = await listTournamentEntries(tournament.id);

      setSeedingEntries(data.items ?? []);
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

    setSeedingEntries((current) => {
      if (fromIndex >= current.length || toIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleSeedDrop(targetIndex) {
    if (!draggingEntryId) {
      return;
    }

    const fromIndex = seedingEntries.findIndex((entry) => entry.id === draggingEntryId);
    moveSeedEntry(fromIndex, targetIndex);
    setDraggingEntryId(null);
  }

  async function handleSeedingSubmit(event) {
    event.preventDefault();

    if (!seedingTournament) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSavingSeeding(true);

    try {
      const data = await updateTournamentEntries(
        seedingTournament.id,
        seedingEntries.map((entry) => entry.id)
      );

      setSeedingEntries(data.items ?? []);
      setSeedingTournament(null);
      setSuccessMessage("Seeding updated.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save bracket seeding.");
    } finally {
      setSavingSeeding(false);
      setDraggingEntryId(null);
    }
  }

  return {
    closeSeedingEditor,
    draggingEntryId,
    handleSeedDrop,
    handleSeedingSubmit,
    openSeedingEditor,
    savingSeeding,
    seedingEntries,
    seedingLoading,
    seedingTournament,
    setDraggingEntryId
  };
}
