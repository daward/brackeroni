"use client";

export function createSeedingStructure() {
  return {
    subBrackets: [],
    entryBrackets: {}
  };
}

export function createEmptySubBracketId() {
  return `sub-bracket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortUnique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function buildLegacySubBrackets(structure = {}) {
  const knownIds = sortUnique([
    ...(structure.groupOrder || []),
    ...(structure.emptySubBrackets || []),
    ...Object.values(structure.entryGroups || {}),
    ...Object.keys(structure.subBracketNames || {})
  ]).filter((groupId) => groupId !== "__root__");

  return knownIds.map((groupId, index) => ({
    id: groupId,
    index,
    name: typeof structure.subBracketNames?.[groupId] === "string"
      ? structure.subBracketNames[groupId]
      : `Sub-bracket ${index + 1}`
  }));
}

export function normalizeSeedingStructure(structure = {}, entries = null) {
  if (typeof structure === "string") {
    try {
      const parsed = JSON.parse(structure);
      structure = parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      structure = {};
    }
  }

  const validEntryIds = Array.isArray(entries)
    ? new Set(entries.map((entry) => entry.id))
    : null;
  const hasModernShape =
    Array.isArray(structure.subBrackets) ||
    (structure.entryBrackets && typeof structure.entryBrackets === "object");
  const rawSubBrackets = hasModernShape
    ? structure.subBrackets || []
    : buildLegacySubBrackets(structure);
  const subBracketIds = new Set();
  const subBrackets = [];

  [...rawSubBrackets]
    .filter((subBracket) => typeof subBracket?.id === "string" && subBracket.id && subBracket.id !== "__root__")
    .sort((left, right) => {
      if ((left.index ?? 0) !== (right.index ?? 0)) {
        return (left.index ?? 0) - (right.index ?? 0);
      }

      return String(left.id).localeCompare(String(right.id));
    })
    .forEach((subBracket, index) => {
      if (subBracketIds.has(subBracket.id)) {
        return;
      }

      subBracketIds.add(subBracket.id);
      subBrackets.push({
        id: subBracket.id,
        index,
        name:
          typeof subBracket.name === "string" && subBracket.name.length > 0
            ? subBracket.name
            : `Sub-bracket ${index + 1}`
      });
    });

  const rawEntryBrackets = hasModernShape
    ? structure.entryBrackets || {}
    : structure.entryGroups || {};
  const entryBrackets = Object.fromEntries(
    Object.entries(rawEntryBrackets).filter(([entryId, bracketId]) => {
      return (
        (validEntryIds === null || validEntryIds.has(entryId)) &&
        typeof bracketId === "string" &&
        subBracketIds.has(bracketId)
      );
    })
  );

  return {
    subBrackets,
    entryBrackets
  };
}

function buildDisplayEntries(groupEntries) {
  const displayEntries = [];
  let nextDisplaySeed = 1;

  for (let position = 0; position < groupEntries.length; position += 1) {
    const { entry, index } = groupEntries[position];
    const previousGroupEntry = displayEntries[displayEntries.length - 1];
    const previousRawEntry = groupEntries[position - 1]?.entry;
    const nextRawEntry = groupEntries[position + 1]?.entry;
    const pairsWithPrevious = Boolean(
      previousRawEntry && (
        entry.seed === previousRawEntry.seed &&
        Number(entry.subSeed || 0) === 1 &&
        Number(previousRawEntry.subSeed || 0) === 0
      )
    );
    const pairsWithNext = Boolean(
      nextRawEntry && (
        entry.seed === nextRawEntry.seed &&
        Number(entry.subSeed || 0) === 0 &&
        Number(nextRawEntry.subSeed || 0) === 1
      )
    );
    const isLocalPlayInSlot = Boolean(
      pairsWithPrevious || pairsWithNext
    );
    const isDetachedEmptySlot = entry.isEmptySlot && !isLocalPlayInSlot;

    if (isDetachedEmptySlot) {
      continue;
    }

    const repeatsPreviousSeed =
      !entry.isEmptySlot &&
      previousGroupEntry &&
      !previousGroupEntry.entry.isEmptySlot &&
      isLocalPlayInSlot &&
      previousGroupEntry.isLocalPlayInSlot;
    const displaySeed = entry.isEmptySlot
      ? null
      : repeatsPreviousSeed
        ? previousGroupEntry.displaySeed
        : nextDisplaySeed++;

    displayEntries.push({
      entry,
      index,
      displaySeed,
      isLocalPlayInSlot,
      pairDirection: pairsWithPrevious ? "previous" : pairsWithNext ? "next" : null,
      canStartPlayIn:
        !entry.isEmptySlot &&
        !isLocalPlayInSlot &&
        Boolean(nextRawEntry) &&
        !nextRawEntry.isEmptySlot
    });
  }

  return displayEntries;
}

function resolveEntryBracketId(entries, entryBrackets, index) {
  const entry = entries[index];

  if (!entry) {
    return "__root__";
  }

  if (!entry.isEmptySlot) {
    return entryBrackets[entry.id] || "__root__";
  }

  const previousEntry = entries[index - 1];
  const nextEntry = entries[index + 1];
  const pairedEntry = [previousEntry, nextEntry].find((candidate) => (
    candidate &&
    !candidate.isEmptySlot &&
    candidate.seed === entry.seed
  ));

  if (pairedEntry) {
    return entryBrackets[pairedEntry.id] || "__root__";
  }

  const nearestRealEntry = [previousEntry, nextEntry].find((candidate) => candidate && !candidate.isEmptySlot);
  return nearestRealEntry ? (entryBrackets[nearestRealEntry.id] || "__root__") : "__root__";
}

export function buildSeedingGroups(entries, structure) {
  const normalized = normalizeSeedingStructure(structure, entries);
  const groupedEntries = entries.map((entry, index) => ({
    entry,
    index,
    bracketId: resolveEntryBracketId(entries, normalized.entryBrackets, index)
  }));
  const groups = [];
  let insertionCursor = 0;

  normalized.subBrackets.forEach((subBracket, position) => {
    const memberEntries = groupedEntries
      .filter(({ bracketId }) => bracketId === subBracket.id)
      .map(({ entry, index }) => ({ entry, index }));
    const displayEntries = buildDisplayEntries(memberEntries);
    const startIndex = memberEntries[0]?.index ?? insertionCursor;

    groups.push({
      id: subBracket.id,
      name: subBracket.name,
      fallbackName: `Sub-bracket ${position + 1}`,
      startIndex,
      entries: displayEntries,
      isCollapsed: false,
      isEmpty: memberEntries.length === 0
    });

    if (memberEntries.length > 0) {
      insertionCursor = memberEntries[memberEntries.length - 1].index + 1;
    }
  });

  const rootEntries = groupedEntries
    .filter(({ bracketId }) => bracketId === "__root__")
    .map(({ entry, index }) => ({ entry, index }));

  groups.push({
    id: "__root__",
    name: "",
    fallbackName: "",
    startIndex: rootEntries[0]?.index ?? insertionCursor,
    entries: buildDisplayEntries(rootEntries),
    isCollapsed: false,
    isEmpty: rootEntries.length === 0
  });

  return groups;
}

export function buildMoveTargets(groups) {
  return groups.map((group) => ({
    id: group.id,
    label: group.name || group.fallbackName || "Top of bracket",
    insertIndex: group.isEmpty
      ? group.startIndex
      : group.entries[group.entries.length - 1]?.index + 1 || group.startIndex
  }));
}

export function addEmptySubBracket(structure, groupId = createEmptySubBracketId()) {
  const normalized = normalizeSeedingStructure(structure);

  if (normalized.subBrackets.some((subBracket) => subBracket.id === groupId)) {
    return normalized;
  }

  return {
    ...normalized,
    subBrackets: [
      ...normalized.subBrackets,
      {
        id: groupId,
        index: normalized.subBrackets.length,
        name: `Sub-bracket ${normalized.subBrackets.length + 1}`
      }
    ]
  };
}

export function updateSubBracketName(structure, groupId, name) {
  const normalized = normalizeSeedingStructure(structure);

  return {
    ...normalized,
    subBrackets: normalized.subBrackets.map((subBracket) =>
      subBracket.id === groupId
        ? { ...subBracket, name }
        : subBracket
    )
  };
}

export function removeSubBracket(structure, groupId) {
  const normalized = normalizeSeedingStructure(structure);
  const entryBrackets = { ...normalized.entryBrackets };

  for (const [entryId, bracketId] of Object.entries(entryBrackets)) {
    if (bracketId === groupId) {
      delete entryBrackets[entryId];
    }
  }

  return {
    subBrackets: normalized.subBrackets
      .filter((subBracket) => subBracket.id !== groupId)
      .map((subBracket, index) => ({ ...subBracket, index })),
    entryBrackets
  };
}

export function assignEntryToGroup(structure, entries, entryId, targetGroupId) {
  const normalized = normalizeSeedingStructure(structure, entries);
  const entryBrackets = { ...normalized.entryBrackets };

  if (!targetGroupId || targetGroupId === "__root__") {
    delete entryBrackets[entryId];
  } else if (normalized.subBrackets.some((subBracket) => subBracket.id === targetGroupId)) {
    entryBrackets[entryId] = targetGroupId;
  }

  return {
    ...normalized,
    entryBrackets
  };
}
