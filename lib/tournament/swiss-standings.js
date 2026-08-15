export function buildSwissStandings(entries, matches) {
  const statsById = new Map(
    entries.map((entry) => [
      entry.id,
      {
        id: entry.id,
        seed: entry.seed,
        wins: 0,
        losses: 0,
        played: 0,
        opponents: []
      }
    ])
  );

  for (const match of matches) {
    if (match.leftEntryId && match.rightEntryId) {
      const left = statsById.get(match.leftEntryId);
      const right = statsById.get(match.rightEntryId);

      if (!left || !right) {
        continue;
      }

      left.played += 1;
      right.played += 1;
      left.opponents.push(right.id);
      right.opponents.push(left.id);

      if (match.winnerEntryId === left.id) {
        left.wins += 1;
        right.losses += 1;
      } else if (match.winnerEntryId === right.id) {
        right.wins += 1;
        left.losses += 1;
      }

      continue;
    }

    const byeWinnerId = match.leftEntryId || match.rightEntryId || match.winnerEntryId;
    const winner = statsById.get(byeWinnerId);

    if (winner) {
      winner.played += 1;
      winner.wins += 1;
    }
  }

  const enriched = [...statsById.values()].map((entry) => ({
    ...entry,
    buchholz: entry.opponents.reduce(
      (total, opponentId) => total + (statsById.get(opponentId)?.wins || 0),
      0
    )
  }));

  enriched.sort((left, right) => {
    if (left.wins !== right.wins) {
      return right.wins - left.wins;
    }

    if (left.buchholz !== right.buchholz) {
      return right.buchholz - left.buchholz;
    }

    if (left.played !== right.played) {
      return right.played - left.played;
    }

    return left.seed - right.seed;
  });

  return enriched;
}
