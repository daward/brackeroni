import type { SeedingEntryRecord, SeedingStructure, SeedingSubBracket } from "@/lib/brackets/types";

export type SeedingStructureInput = Partial<SeedingStructure> & {
  groupOrder?: string[];
  emptySubBrackets?: string[];
  entryGroups?: Record<string, string>;
  subBracketNames?: Record<string, string>;
  collapsedGroups?: Record<string, boolean>;
};
export type SeedingGroupEntry = {
  entry: SeedingEntryRecord;
  index: number;
  displaySeed: number | null;
  isLocalPlayInSlot: boolean;
  pairDirection: "previous" | "next" | null;
  canStartPlayIn: boolean;
};
export type SeedingGroup = { id: string; name: string; fallbackName: string; startIndex: number; entries: SeedingGroupEntry[]; isCollapsed: boolean; isEmpty: boolean };

export function createSeedingStructure(): SeedingStructure {
  return { subBrackets: [], entryBrackets: {} };
}
export function createEmptySubBracketId(): string {
  return `sub-bracket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortUnique(values: (string | undefined)[] = []): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
function buildLegacySubBrackets(structure: SeedingStructureInput): SeedingSubBracket[] {
  const knownIds = sortUnique([
    ...(structure.groupOrder || []),
    ...(structure.emptySubBrackets || []),
    ...Object.values(structure.entryGroups || {}),
    ...Object.keys(structure.subBracketNames || {}),
  ]).filter((groupId) => groupId !== "__root__");
  return knownIds.map((id, index) => {
    const name = structure.subBracketNames?.[id];
    return { id, index, name: typeof name === "string" ? name : `Sub-bracket ${index + 1}` };
  });
}

export function normalizeSeedingStructure(input: SeedingStructureInput | string | null | undefined = {}, entries: SeedingEntryRecord[] | null = null): SeedingStructure {
  let structure: SeedingStructureInput =
    typeof input === "string"
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(input);
            return parsed && typeof parsed === "object" ? (parsed as SeedingStructureInput) : {};
          } catch {
            return {};
          }
        })()
      : input || {};
  const validEntryIds = Array.isArray(entries) ? new Set(entries.map((entry) => entry.id)) : null;
  const hasModernShape = Array.isArray(structure.subBrackets) || (structure.entryBrackets && typeof structure.entryBrackets === "object");
  const rawSubBrackets = hasModernShape ? structure.subBrackets || [] : buildLegacySubBrackets(structure);
  const subBracketIds = new Set<string>();
  const subBrackets: SeedingSubBracket[] = [];
  [...rawSubBrackets]
    .filter((item): item is SeedingSubBracket => typeof item?.id === "string" && Boolean(item.id) && item.id !== "__root__")
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0) || left.id.localeCompare(right.id))
    .forEach((subBracket, index) => {
      if (subBracketIds.has(subBracket.id)) return;
      subBracketIds.add(subBracket.id);
      subBrackets.push({ id: subBracket.id, index, name: typeof subBracket.name === "string" ? subBracket.name : `Sub-bracket ${index + 1}` });
    });
  const rawEntryBrackets = hasModernShape ? structure.entryBrackets || {} : structure.entryGroups || {};
  const entryBrackets = Object.fromEntries(
    Object.entries(rawEntryBrackets).filter(
      ([entryId, bracketId]) => (validEntryIds === null || validEntryIds.has(entryId)) && typeof bracketId === "string" && subBracketIds.has(bracketId),
    ),
  );
  return { subBrackets, entryBrackets };
}

function buildDisplayEntries(groupEntries: Array<{ entry: SeedingEntryRecord; index: number }>): SeedingGroupEntry[] {
  const displayEntries: SeedingGroupEntry[] = [];
  let nextDisplaySeed = 1;
  for (let position = 0; position < groupEntries.length; position += 1) {
    const { entry, index } = groupEntries[position];
    const previousGroupEntry = displayEntries.at(-1);
    const previousRawEntry = groupEntries[position - 1]?.entry;
    const nextRawEntry = groupEntries[position + 1]?.entry;
    const pairsWithPrevious = Boolean(previousRawEntry && entry.seed === previousRawEntry.seed && Number(entry.subSeed || 0) === 1 && Number(previousRawEntry.subSeed || 0) === 0);
    const pairsWithNext = Boolean(nextRawEntry && entry.seed === nextRawEntry.seed && Number(entry.subSeed || 0) === 0 && Number(nextRawEntry.subSeed || 0) === 1);
    const isLocalPlayInSlot = pairsWithPrevious || pairsWithNext;
    const isDetachedEmptySlot = entry.isEmptySlot && !isLocalPlayInSlot;
    if (isDetachedEmptySlot) continue;
    const repeatsPreviousSeed = !entry.isEmptySlot && previousGroupEntry && !previousGroupEntry.entry.isEmptySlot && isLocalPlayInSlot && previousGroupEntry.isLocalPlayInSlot;
    let displaySeed: number | null = null;
    if (!entry.isEmptySlot) {
      displaySeed = repeatsPreviousSeed ? previousGroupEntry.displaySeed : nextDisplaySeed++;
    }
    let pairDirection: SeedingGroupEntry["pairDirection"] = null;
    if (pairsWithPrevious) pairDirection = "previous";
    if (pairsWithNext) pairDirection = "next";
    displayEntries.push({
      entry,
      index,
      displaySeed,
      isLocalPlayInSlot,
      pairDirection,
      canStartPlayIn: !entry.isEmptySlot && !isLocalPlayInSlot && Boolean(nextRawEntry) && !nextRawEntry.isEmptySlot,
    });
  }
  return displayEntries;
}
function resolveEntryBracketId(entries: SeedingEntryRecord[], entryBrackets: Record<string, string>, index: number): string {
  const entry = entries[index];
  if (!entry) return "__root__";
  if (!entry.isEmptySlot) return entryBrackets[entry.id] || "__root__";
  const previous = entries[index - 1];
  const next = entries[index + 1];
  const paired = [previous, next].find((candidate) => candidate && !candidate.isEmptySlot && candidate.seed === entry.seed);
  if (paired) return entryBrackets[paired.id] || "__root__";
  const nearest = [previous, next].find((candidate) => candidate && !candidate.isEmptySlot);
  return nearest ? entryBrackets[nearest.id] || "__root__" : "__root__";
}
export function buildSeedingGroups(entries: SeedingEntryRecord[], structure: SeedingStructureInput | string | null | undefined): SeedingGroup[] {
  const normalized = normalizeSeedingStructure(structure, entries);
  const grouped = entries.map((entry, index) => ({ entry, index, bracketId: resolveEntryBracketId(entries, normalized.entryBrackets, index) }));
  const groups: SeedingGroup[] = [];
  let insertionCursor = 0;
  normalized.subBrackets.forEach((subBracket, position) => {
    const members = grouped.filter(({ bracketId }) => bracketId === subBracket.id).map(({ entry, index }) => ({ entry, index }));
    const startIndex = members[0]?.index ?? insertionCursor;
    groups.push({
      id: subBracket.id,
      name: subBracket.name,
      fallbackName: `Sub-bracket ${position + 1}`,
      startIndex,
      entries: buildDisplayEntries(members),
      isCollapsed: false,
      isEmpty: members.length === 0,
    });
    if (members.length) insertionCursor = members.at(-1)!.index + 1;
  });
  const root = grouped.filter(({ bracketId }) => bracketId === "__root__").map(({ entry, index }) => ({ entry, index }));
  groups.push({
    id: "__root__",
    name: "",
    fallbackName: "",
    startIndex: root[0]?.index ?? insertionCursor,
    entries: buildDisplayEntries(root),
    isCollapsed: false,
    isEmpty: root.length === 0,
  });
  return groups;
}
export function buildMoveTargets(groups: SeedingGroup[]): Array<{ id: string; label: string; insertIndex: number }> {
  return groups.map((group) => ({
    id: group.id,
    label: group.name || group.fallbackName || "Top of bracket",
    insertIndex: group.isEmpty ? group.startIndex : (group.entries.at(-1)?.index ?? group.startIndex - 1) + 1,
  }));
}
export function addEmptySubBracket(structure: SeedingStructureInput | string | null | undefined, groupId = createEmptySubBracketId()): SeedingStructure {
  const normalized = normalizeSeedingStructure(structure);
  if (normalized.subBrackets.some((item) => item.id === groupId)) return normalized;
  return {
    ...normalized,
    subBrackets: [...normalized.subBrackets, { id: groupId, index: normalized.subBrackets.length, name: `Sub-bracket ${normalized.subBrackets.length + 1}` }],
  };
}
export function updateSubBracketName(structure: SeedingStructureInput | string | null | undefined, groupId: string, name: string): SeedingStructure {
  const normalized = normalizeSeedingStructure(structure);
  return { ...normalized, subBrackets: normalized.subBrackets.map((item) => (item.id === groupId ? { ...item, name } : item)) };
}
export function removeSubBracket(structure: SeedingStructureInput | string | null | undefined, groupId: string): SeedingStructure {
  const normalized = normalizeSeedingStructure(structure);
  const entryBrackets = { ...normalized.entryBrackets };
  for (const [entryId, bracketId] of Object.entries(entryBrackets)) if (bracketId === groupId) delete entryBrackets[entryId];
  return { subBrackets: normalized.subBrackets.filter((item) => item.id !== groupId).map((item, index) => ({ ...item, index })), entryBrackets };
}
export function assignEntryToGroup(
  structure: SeedingStructureInput | string | null | undefined,
  entries: SeedingEntryRecord[],
  entryId: string,
  targetGroupId: string,
): SeedingStructure {
  const normalized = normalizeSeedingStructure(structure, entries);
  const entryBrackets = { ...normalized.entryBrackets };
  if (!targetGroupId || targetGroupId === "__root__") delete entryBrackets[entryId];
  else if (normalized.subBrackets.some((item) => item.id === targetGroupId)) entryBrackets[entryId] = targetGroupId;
  return { ...normalized, entryBrackets };
}
