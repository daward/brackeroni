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

function buildSeededRound(entries, roundNumber) {
  const sortedEntries = [...entries].sort((a, b) => a.seed - b.seed);

  if (sortedEntries.length < 2) {
    throw new Error("NOT_ENOUGH_ENTRIES");
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

export function buildInitialRound(entries) {
  return buildSeededRound(entries, 1);
}

export function buildNextRound(entries, { playStyle, roundNumber }) {
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
