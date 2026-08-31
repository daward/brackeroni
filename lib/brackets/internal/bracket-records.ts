import type { Bracket } from "@/lib/brackets/types";
import type { BracketCandidate } from "@/lib/brackets/types";

export type FlatBracketWinnerRecord = {
  id: string;
  winner?: BracketCandidate | null;
  winnerEntryId?: string | null;
  winnerName?: string | null;
  winnerSeed?: number | null;
  winnerImageUrl?: string | null;
} & Record<string, unknown>;

export function normalizeFlatBracketWinner<T extends FlatBracketWinnerRecord>(record: T): Omit<T, "winner" | "winnerEntryId" | "winnerName" | "winnerSeed" | "winnerImageUrl"> & {
  winner: BracketCandidate | null;
} {
  const { winner, winnerEntryId, winnerName, winnerSeed, winnerImageUrl, ...rest } = record;

  return {
    ...rest,
    winner: winner ?? toSeededCandidate(winnerEntryId, winnerName, winnerSeed, winnerImageUrl),
  };
}

export function normalizeFlatBracketWinners<T extends FlatBracketWinnerRecord>(records: T[] = []): Array<ReturnType<typeof normalizeFlatBracketWinner<T>>> {
  return records.map(normalizeFlatBracketWinner);
}

function toSeededCandidate(id?: string | null, name?: string | null, seed?: number | null, imageUrl?: string | null): BracketCandidate | null {
  if (!id || !name || seed == null) return null;
  return { id, name, seed, imageUrl: imageUrl ?? null };
}
