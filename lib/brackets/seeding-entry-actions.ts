import type { SeedingEntry } from "@/lib/brackets/seeding-entry-policy";
import { createEmptySlot, normalizeSeedingEntries } from "@/lib/brackets/seeding-entry-policy";

export function togglePlayInEntries(entries: SeedingEntry[], firstEntryId: string, secondEntryId: string): SeedingEntry[] {
  if (!firstEntryId || !secondEntryId || firstEntryId === secondEntryId) return entries;
  const firstEntry = entries.find((entry) => entry.id === firstEntryId);
  if (!firstEntry) return entries;
  return normalizeSeedingEntries(
    entries.map((entry) => {
      if (entry.id === firstEntryId) return { ...entry, seed: firstEntry.seed, subSeed: 0, isEmptySlot: false };
      if (entry.id === secondEntryId) return { ...entry, seed: firstEntry.seed, subSeed: 1, isEmptySlot: false };
      return entry;
    }),
  );
}

export function removeFromPlayInEntries(entries: SeedingEntry[], entryId: string, partnerEntryId: string): SeedingEntry[] {
  if (!entryId || !partnerEntryId || entryId === partnerEntryId) return entries;
  const next = entries.map((entry) => ({ ...entry }));
  const targetIndex = next.findIndex((entry) => entry.id === entryId);
  const partnerIndex = next.findIndex((entry) => entry.id === partnerEntryId);
  if (targetIndex < 0 || partnerIndex < 0) return entries;
  const target = next[targetIndex];
  const partner = next[partnerIndex];
  if (!target || !partner) return entries;
  if (target.isEmptySlot || partner.isEmptySlot) {
    return normalizeSeedingEntries(
      next.filter((entry) => !(entry.isEmptySlot && entry.seed === target.seed)).map((entry) => ({ ...entry, subSeed: entry.seed === target.seed ? 0 : entry.subSeed || 0 })),
    );
  }
  const remainingEntries = next.filter((entry) => entry.id !== entryId);
  remainingEntries.splice(targetIndex, 0, createEmptySlot(target.seed, Number(target.subSeed || 0)));
  const partnerIndexAfterInsert = remainingEntries.findIndex((entry) => entry.id === partnerEntryId);
  if (partnerIndexAfterInsert < 0) return entries;
  remainingEntries.splice(partnerIndexAfterInsert + 1, 0, { ...target, subSeed: 0, isEmptySlot: false });
  return normalizeSeedingEntries(remainingEntries);
}

export function moveEntryToIndex(entries: SeedingEntry[], fromIndex: number, toIndex: number): SeedingEntry[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= entries.length || toIndex > entries.length) return entries;
  const next = entries.map((entry) => ({ ...entry }));
  const movedEntry = next[fromIndex];
  const targetEntry = next[toIndex];
  if (!movedEntry || movedEntry.isEmptySlot) return entries;
  const [moved] = next.splice(fromIndex, 1);
  const adjustedTargetIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  if (targetEntry?.isEmptySlot) {
    const emptySlot = next[adjustedTargetIndex];
    if (!emptySlot?.isEmptySlot) return entries;
    next.splice(adjustedTargetIndex, 1, { ...moved, seed: emptySlot.seed, subSeed: emptySlot.subSeed || 0, isEmptySlot: false });
    return normalizeSeedingEntries(next);
  }
  next.splice(adjustedTargetIndex, 0, { ...moved, subSeed: 0 });
  return normalizeSeedingEntries(next);
}

export function togglePlayInAtIndexEntries(entries: SeedingEntry[], index: number): SeedingEntry[] {
  const currentEntry = entries[index];
  const nextEntry = entries[index + 1];
  if (!currentEntry || !nextEntry || currentEntry.isEmptySlot || nextEntry.isEmptySlot || currentEntry.seed === nextEntry.seed) return entries;
  return togglePlayInEntries(entries, currentEntry.id, nextEntry.id);
}

export function removeFromPlayInAtIndexEntries(entries: SeedingEntry[], index: number): SeedingEntry[] {
  const target = entries[index];
  if (!target) return entries;
  const previous = entries[index - 1];
  const next = entries[index + 1];
  if (previous?.seed === target.seed) {
    return removeFromPlayInEntries(entries, target.id, previous.id);
  }
  if (next?.seed === target.seed) {
    return removeFromPlayInEntries(entries, target.id, next.id);
  }
  return entries;
}
