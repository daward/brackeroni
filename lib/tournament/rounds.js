export function nextPowerOfTwo(value) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
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
