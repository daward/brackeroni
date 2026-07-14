"use client";

import {
  createTournament,
  favoritePool,
  startTournament
} from "@/lib/client-api/create-workspace";

export function addPoolToFavorites(poolId) {
  return favoritePool(poolId);
}

export async function createAndStartFavoriteBracket(pool) {
  const createData = await createTournament({
    title: `${pool.name} Favorites`,
    description: pool.description || null,
    sourcePoolId: pool.id,
    sharingMode: "private",
    visibility: "private",
    votingAccess: "signed_in_only",
    playStyle: "fixed_bracket",
    resultMode: "winner_only",
    tieBreakMode: "higher_seed_wins"
  });
  const tournamentId = createData.item?.id;

  if (!tournamentId) {
    throw new Error("Failed to create bracket.");
  }

  await startTournament(tournamentId);
  return createData.item;
}
