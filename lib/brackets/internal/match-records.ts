import type { BracketMatch } from "@/lib/brackets/types";
import type { BracketMatchSide } from "@/lib/brackets/types";

export type FlatBracketMatchRecord = Omit<BracketMatch, "left" | "right"> & {
  leftEntryId?: string | null;
  rightEntryId?: string | null;
  leftName?: string | null;
  rightName?: string | null;
  leftSeed?: number | null;
  rightSeed?: number | null;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
  leftVoteCount?: number | null;
  rightVoteCount?: number | null;
};

export function normalizeFlatBracketMatch(match: FlatBracketMatchRecord): BracketMatch {
  const {
    leftEntryId,
    rightEntryId,
    leftName,
    rightName,
    leftSeed,
    rightSeed,
    leftImageUrl,
    rightImageUrl,
    leftVoteCount,
    rightVoteCount,
    ...rest
  } = match;

  return {
    ...rest,
    left: toMatchSide({
      id: leftEntryId,
      name: leftName,
      seed: leftSeed,
      voteCount: leftVoteCount,
      imageUrl: leftImageUrl,
    }),
    right: toMatchSide({
      id: rightEntryId,
      name: rightName,
      seed: rightSeed,
      voteCount: rightVoteCount,
      imageUrl: rightImageUrl,
    }),
  };
}

export function normalizeFlatBracketMatches(matches: FlatBracketMatchRecord[] = []): BracketMatch[] {
  return matches.map(normalizeFlatBracketMatch);
}

function toMatchSide({
  id,
  name,
  seed,
  imageUrl,
  voteCount,
}: {
  id?: string | null;
  name?: string | null;
  seed?: number | null;
  imageUrl?: string | null;
  voteCount?: number | null;
}): BracketMatchSide | null {
  if (!id || !name || seed == null) return null;
  return { id, name, seed, imageUrl: imageUrl ?? null, voteCount };
}
