"use client";
import { useEffect, useRef, useState } from "react";
import { updateTournamentEntries } from "@/lib/client-api/create-workspace";
import type { SeedingEntry } from "./seeding-entry-policy";
import type { SeedingPayloadEntry, SeedingStructure } from "@/lib/brackets/types";

type SaveJob = { tournamentId: string; snapshot: string; payload: SeedingPayloadEntry[]; structure: SeedingStructure };
type Options = SaveJob & { enabled: boolean; valid: boolean; onSaved: (data: unknown) => Promise<void> | void; onError: (message: string) => void; onSaving: () => void };

export function useSeedingAutosave({ enabled, valid, tournamentId, snapshot, payload, structure, onSaved, onError, onSaving }: Options) {
  const [savingSeeding, setSavingSeeding] = useState(false);
  const [seedingSaveError, setSeedingSaveError] = useState("");
  const inFlight = useRef(false);
  const queued = useRef<SaveJob | null>(null);
  const blocked = useRef("");
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  useEffect(() => {
    if (!enabled || !valid || blocked.current === snapshot) return;
    const save = async (job: SaveJob): Promise<void> => {
      inFlight.current = true;
      if (mounted.current) {
        setSavingSeeding(true);
        setSeedingSaveError("");
        onSaving();
      }
      try {
        const data = await updateTournamentEntries(job.tournamentId, job.payload, job.structure);
        if (mounted.current) await onSaved(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save bracket seeding.";
        blocked.current = job.snapshot;
        if (mounted.current) {
          setSeedingSaveError(message);
          onError(message);
        }
      } finally {
        const next = queued.current;
        queued.current = null;
        if (next && next.snapshot !== job.snapshot) {
          await save(next);
          return;
        }
        inFlight.current = false;
        if (mounted.current) setSavingSeeding(false);
      }
    };
    const timer = window.setTimeout(() => {
      const job = { tournamentId, snapshot, payload, structure };
      if (inFlight.current) queued.current = job;
      else void save(job);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [enabled, valid, tournamentId, snapshot, payload, structure, onSaved, onError, onSaving]);
  return { savingSeeding, seedingSaveError };
}
