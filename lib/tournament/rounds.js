export function nextPowerOfTwo(value) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

export function calculateSwissRoundCount(entryCount) {
  if (entryCount <= 1) {
    return 0;
  }

  const hardCap = entryCount - 1 + (entryCount % 2 === 1 ? 1 : 0);
  return Math.min(hardCap, Math.ceil(Math.log2(entryCount)) + 1);
}

function previousPowerOfTwo(value) {
  let size = 1;
  while (size * 2 <= value) {
    size *= 2;
  }
  return size;
}

function buildSeedOrder(size) {
  if (size === 2) {
    return [1, 2];
  }

  const previous = buildSeedOrder(size / 2);
  const mirrored = previous.map((seed) => size + 1 - seed);
  const order = [];

  for (let index = 0; index < previous.length; index += 1) {
    order.push(previous[index], mirrored[index]);
  }

  return order;
}

function normalizeSeedingStructure(seedingStructure = {}) {
  const rawSubBrackets = Array.isArray(seedingStructure?.subBrackets)
    ? seedingStructure.subBrackets
    : [];
  const subBrackets = [...rawSubBrackets]
    .filter((subBracket) => typeof subBracket?.id === "string" && subBracket.id && subBracket.id !== "__root__")
    .sort((left, right) => {
      if ((left.index ?? 0) !== (right.index ?? 0)) {
        return (left.index ?? 0) - (right.index ?? 0);
      }

      return String(left.id).localeCompare(String(right.id));
    })
    .map((subBracket, index) => ({
      id: subBracket.id,
      index,
      name:
        typeof subBracket.name === "string" && subBracket.name.length > 0
          ? subBracket.name
          : `Sub-bracket ${index + 1}`
    }));
  const subBracketIds = new Set(subBrackets.map((subBracket) => subBracket.id));
  const entryBrackets = Object.fromEntries(
    Object.entries(seedingStructure?.entryBrackets || {}).filter(([entryId, bracketId]) => (
      typeof entryId === "string" &&
      typeof bracketId === "string" &&
      subBracketIds.has(bracketId)
    ))
  );

  return {
    subBrackets,
    entryBrackets
  };
}

function hasSubBracketAssignments(entries, seedingStructure = {}) {
  const normalized = normalizeSeedingStructure(seedingStructure);
  return entries.some((entry) => normalized.entryBrackets[entry.id]);
}

function localizeGroupEntries(entries) {
  const sortedEntries = [...entries].sort((left, right) => {
    if (left.seed !== right.seed) {
      return left.seed - right.seed;
    }

    return (left.subSeed || 0) - (right.subSeed || 0);
  });
  const seedMap = new Map();
  let nextSeed = 1;

  return sortedEntries.map((entry) => {
    if (!seedMap.has(entry.seed)) {
      seedMap.set(entry.seed, nextSeed);
      nextSeed += 1;
    }

    return {
      ...entry,
      seed: seedMap.get(entry.seed)
    };
  });
}

function buildBracketGroups(entries, seedingStructure = {}) {
  const normalized = normalizeSeedingStructure(seedingStructure);
  const orderedGroups = normalized.subBrackets.map((subBracket) => ({
    id: subBracket.id,
    entries: []
  }));
  const rootGroup = {
    id: "__root__",
    entries: []
  };
  const groupById = new Map(orderedGroups.map((group) => [group.id, group]));

  for (const entry of entries) {
    const bracketId = normalized.entryBrackets[entry.id];

    if (bracketId && groupById.has(bracketId)) {
      groupById.get(bracketId).entries.push(entry);
      continue;
    }

    rootGroup.entries.push(entry);
  }

  const groups = orderedGroups.filter((group) => group.entries.length > 0);
  if (rootGroup.entries.length > 0) {
    groups.push(rootGroup);
  }

  return groups.map((group) => ({
    ...group,
    entries: localizeGroupEntries(group.entries)
  }));
}

function prefixMatches(matches, prefix) {
  return matches.map((match) => ({
    ...match,
    pairKey: `${prefix}-${match.pairKey}`
  }));
}

function buildGroupByeMatch(entry, roundNumber, groupId) {
  return {
    leftEntryId: entry.id,
    rightEntryId: null,
    leftSeed: entry.seed,
    rightSeed: null,
    leftSlotType: "entry",
    rightSlotType: "bye",
    status: "auto_resolved",
    resolutionSource: "bye",
    winnerEntryId: entry.id,
    pairKey: `group-${groupId}-round-${roundNumber}-seed-${entry.seed}-bye`
  };
}

function buildSubBracketRound(entries, roundNumber, playStyle = "reseed", seedingStructure = {}) {
  const groups = buildBracketGroups(entries, seedingStructure);

  if (groups.length <= 1) {
    const flattenedEntries = groups[0]?.entries || entries;
    if (playStyle === "fixed_bracket") {
      return buildFixedBracketRound(flattenedEntries, roundNumber);
    }

    return buildSeededRound(flattenedEntries, roundNumber);
  }

  const nonEmptyGroups = groups.filter((group) => group.entries.length > 0);
  const allGroupsCollapsedToOne = nonEmptyGroups.every((group) => group.entries.length === 1);

  if (allGroupsCollapsedToOne) {
    const crossBracketEntries = nonEmptyGroups.map((group, index) => ({
      ...group.entries[0],
      seed: index + 1,
      subSeed: 0
    }));
    const matches =
      playStyle === "fixed_bracket"
        ? buildFixedBracketRound(crossBracketEntries, roundNumber)
        : buildSeededRound(crossBracketEntries, roundNumber);

    return prefixMatches(matches, "cross");
  }

  const matches = [];

  for (const group of nonEmptyGroups) {
    if (group.entries.length === 1) {
      matches.push(buildGroupByeMatch(group.entries[0], roundNumber, group.id));
      continue;
    }

    const groupMatches =
      playStyle === "fixed_bracket"
        ? buildFixedBracketRound(group.entries, roundNumber)
        : buildSeededRound(group.entries, roundNumber);
    matches.push(...prefixMatches(groupMatches, `group-${group.id}`));
  }

  return matches;
}

function buildSeededRound(entries, roundNumber) {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.seed !== b.seed) {
      return a.seed - b.seed;
    }

    return (a.subSeed || 0) - (b.subSeed || 0);
  });

  if (sortedEntries.length < 2) {
    throw new Error("NOT_ENOUGH_ENTRIES");
  }

  const duplicateSeedEntries = new Map();

  for (const entry of sortedEntries) {
    const bucket = duplicateSeedEntries.get(entry.seed) || [];
    bucket.push(entry);
    duplicateSeedEntries.set(entry.seed, bucket);
  }

  const playInSeeds = [...duplicateSeedEntries.entries()]
    .filter(([, seedEntries]) => seedEntries.length > 1);

  if (playInSeeds.length > 0) {
    const matches = [];

    for (const entry of sortedEntries) {
      const seedEntries = duplicateSeedEntries.get(entry.seed) || [];

      if (seedEntries.length === 1) {
        matches.push({
          leftEntryId: entry.id,
          rightEntryId: null,
          leftSeed: entry.seed,
          rightSeed: null,
          leftSlotType: "entry",
          rightSlotType: "bye",
          status: "auto_resolved",
          resolutionSource: "bye",
          winnerEntryId: entry.id,
          pairKey: `round-${roundNumber}-seed-${entry.seed}-bye`
        });
      }
    }

    for (const [seed, seedEntries] of playInSeeds) {
      const orderedSeedEntries = [...seedEntries].sort(
        (left, right) => (left.subSeed || 0) - (right.subSeed || 0)
      );
      const leftEntry = orderedSeedEntries[0];
      const rightEntry = orderedSeedEntries[1];

      matches.push({
        leftEntryId: leftEntry.id,
        rightEntryId: rightEntry.id,
        leftSeed: leftEntry.seed,
        rightSeed: rightEntry.seed,
        leftSlotType: "entry",
        rightSlotType: "entry",
        status: "open",
        resolutionSource: null,
        winnerEntryId: null,
        pairKey: `round-${roundNumber}-play-in-seed-${seed}`
      });
    }

    return matches.sort((left, right) => {
      const leftSeed = Number(left.leftSeed || Number.MAX_SAFE_INTEGER);
      const rightSeed = Number(right.leftSeed || Number.MAX_SAFE_INTEGER);
      return leftSeed - rightSeed;
    });
  }

  const totalEntries = sortedEntries.length;
  const fullBracketSize = nextPowerOfTwo(totalEntries);
  const priorBracketSize =
    totalEntries === fullBracketSize ? fullBracketSize / 2 : previousPowerOfTwo(totalEntries);
  const playInEntryCount =
    totalEntries === fullBracketSize ? totalEntries : (totalEntries - priorBracketSize) * 2;
  const byeCount = totalEntries - playInEntryCount;
  const byeEntries = sortedEntries.slice(0, byeCount);
  const playInEntries = sortedEntries.slice(byeCount);
  const matches = [];

  for (const winner of byeEntries) {
    matches.push({
      leftEntryId: winner.id,
      rightEntryId: null,
      leftSeed: winner.seed,
      rightSeed: null,
      leftSlotType: "entry",
      rightSlotType: "bye",
      status: "auto_resolved",
      resolutionSource: "bye",
      winnerEntryId: winner.id,
      pairKey: `round-${roundNumber}-seed-${winner.seed}-bye`
    });
  }

  for (let index = 0; index < playInEntries.length / 2; index += 1) {
    const leftEntry = playInEntries[index];
    const rightEntry = playInEntries[playInEntries.length - 1 - index];

    matches.push({
      leftEntryId: leftEntry.id,
      rightEntryId: rightEntry.id,
      leftSeed: leftEntry.seed,
      rightSeed: rightEntry.seed,
      leftSlotType: "entry",
      rightSlotType: "entry",
      status: "open",
      resolutionSource: null,
      winnerEntryId: null,
      pairKey: `round-${roundNumber}-seed-${leftEntry.seed}-${rightEntry.seed}`
    });
  }

  return matches;
}

function buildFixedBracketRound(entries, roundNumber) {
  const orderedEntries = [...entries];

  if (orderedEntries.length < 2) {
    throw new Error("NOT_ENOUGH_ENTRIES");
  }

  const bracketSize = nextPowerOfTwo(orderedEntries.length);
  const byeCount = bracketSize - orderedEntries.length;
  const matches = [];

  for (let index = 0; index < byeCount; index += 1) {
    const entry = orderedEntries[index];

    matches.push({
      leftEntryId: entry.id,
      rightEntryId: null,
      leftSeed: entry.seed,
      rightSeed: null,
      leftSlotType: "entry",
      rightSlotType: "bye",
      status: "auto_resolved",
      resolutionSource: "bye",
      winnerEntryId: entry.id,
      pairKey: `round-${roundNumber}-slot-${index + 1}-bye-seed-${entry.seed}`
    });
  }

  for (let index = byeCount; index < orderedEntries.length; index += 2) {
    const leftEntry = orderedEntries[index];
    const rightEntry = orderedEntries[index + 1];

    matches.push({
      leftEntryId: leftEntry.id,
      rightEntryId: rightEntry.id,
      leftSeed: leftEntry.seed,
      rightSeed: rightEntry.seed,
      leftSlotType: "entry",
      rightSlotType: "entry",
      status: "open",
      resolutionSource: null,
      winnerEntryId: null,
      pairKey: `round-${roundNumber}-slot-${index + 1}-${leftEntry.seed}-${rightEntry.seed}`
    });
  }

  return matches;
}

export function buildInitialRound(entries, seedingStructure = {}) {
  if (hasSubBracketAssignments(entries, seedingStructure)) {
    return buildSubBracketRound(entries, 1, "reseed", seedingStructure);
  }

  return buildSeededRound(entries, 1);
}

export function buildNextRound(entries, { playStyle, roundNumber, seedingStructure = {} }) {
  if (hasSubBracketAssignments(entries, seedingStructure)) {
    return buildSubBracketRound(entries, roundNumber, playStyle, seedingStructure);
  }

  if (playStyle === "fixed_bracket") {
    return buildFixedBracketRound(entries, roundNumber);
  }

  return buildSeededRound(entries, roundNumber);
}

export function buildSwissRound(entries, { roundNumber, priorMatches = [] }) {
  const normalizedEntries = [...entries].map((entry) => ({
    ...entry,
    score: Number(entry.score || 0),
    buchholz: Number(entry.buchholz || 0)
  }));

  if (normalizedEntries.length < 2) {
    throw new Error("NOT_ENOUGH_ENTRIES");
  }

  const rematchSet = new Set();
  const byeRecipients = new Set();

  for (const match of priorMatches) {
    if (match.leftEntryId && match.rightEntryId) {
      rematchSet.add(buildSwissPairKey(match.leftEntryId, match.rightEntryId));
    } else {
      const byeEntryId = match.leftEntryId || match.rightEntryId || match.winnerEntryId;

      if (byeEntryId) {
        byeRecipients.add(byeEntryId);
      }
    }
  }

  const allScoresEqual = normalizedEntries.every(
    (entry) => entry.score === normalizedEntries[0].score
  );
  const orderedEntries =
    roundNumber === 1 && priorMatches.length === 0 && allScoresEqual
      ? buildSwissFirstRoundOrder(normalizedEntries)
      : normalizedEntries.sort(compareSwissEntries);

  const matches = [];
  let pairableEntries = orderedEntries;

  if (pairableEntries.length % 2 === 1) {
    const byeIndex = findSwissByeIndex(pairableEntries, byeRecipients);
    const [byeEntry] = pairableEntries.splice(byeIndex, 1);

    matches.push({
      leftEntryId: byeEntry.id,
      rightEntryId: null,
      leftSeed: byeEntry.seed,
      rightSeed: null,
      leftSlotType: "entry",
      rightSlotType: "bye",
      status: "auto_resolved",
      resolutionSource: "bye",
      winnerEntryId: byeEntry.id,
      pairKey: `round-${roundNumber}-swiss-bye-${byeEntry.seed}`
    });
  }

  const pairings = pairSwissEntries(pairableEntries, rematchSet);

  if (!pairings) {
    throw new Error("SWISS_PAIRING_FAILED");
  }

  for (const [leftEntry, rightEntry] of pairings) {
    matches.push({
      leftEntryId: leftEntry.id,
      rightEntryId: rightEntry.id,
      leftSeed: leftEntry.seed,
      rightSeed: rightEntry.seed,
      leftSlotType: "entry",
      rightSlotType: "entry",
      status: "open",
      resolutionSource: null,
      winnerEntryId: null,
      pairKey: `round-${roundNumber}-swiss-${Math.min(leftEntry.seed, rightEntry.seed)}-${Math.max(leftEntry.seed, rightEntry.seed)}`
    });
  }

  return matches;
}

function buildSwissFirstRoundOrder(entries) {
  const sortedEntries = [...entries].sort((left, right) => left.seed - right.seed);
  const midpoint = Math.ceil(sortedEntries.length / 2);
  const topHalf = sortedEntries.slice(0, midpoint);
  const bottomHalf = sortedEntries.slice(midpoint);
  const orderedEntries = [];

  for (let index = 0; index < topHalf.length; index += 1) {
    orderedEntries.push(topHalf[index]);

    if (bottomHalf[index]) {
      orderedEntries.push(bottomHalf[index]);
    }
  }

  return orderedEntries;
}

function compareSwissEntries(left, right) {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.buchholz !== right.buchholz) {
    return right.buchholz - left.buchholz;
  }

  return left.seed - right.seed;
}

function buildSwissPairKey(leftEntryId, rightEntryId) {
  return [leftEntryId, rightEntryId].sort().join(":");
}

function findSwissByeIndex(entries, byeRecipients) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (!byeRecipients.has(entries[index].id)) {
      return index;
    }
  }

  return entries.length - 1;
}

function pairSwissEntries(entries, rematchSet) {
  if (entries.length === 0) {
    return [];
  }

  const [firstEntry, ...rest] = entries;
  const preferredIndexes = [];
  const fallbackIndexes = [];

  for (let index = 0; index < rest.length; index += 1) {
    const candidate = rest[index];

    if (rematchSet.has(buildSwissPairKey(firstEntry.id, candidate.id))) {
      fallbackIndexes.push(index);
    } else {
      preferredIndexes.push(index);
    }
  }

  const candidateIndexes = preferredIndexes.length > 0 ? preferredIndexes : fallbackIndexes;

  for (const index of candidateIndexes) {
    const candidate = rest[index];
    const remaining = rest.filter((_, restIndex) => restIndex !== index);
    const remainingPairs = pairSwissEntries(remaining, rematchSet);

    if (remainingPairs) {
      return [[firstEntry, candidate], ...remainingPairs];
    }
  }

  if (preferredIndexes.length > 0 && fallbackIndexes.length > 0) {
    for (const index of fallbackIndexes) {
      const candidate = rest[index];
      const remaining = rest.filter((_, restIndex) => restIndex !== index);
      const remainingPairs = pairSwissEntries(remaining, rematchSet);

      if (remainingPairs) {
        return [[firstEntry, candidate], ...remainingPairs];
      }
    }
  }

  return null;
}
