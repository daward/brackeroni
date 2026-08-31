import { formatResultModeLabel } from "@/lib/brackets/engine/result-modes";
import type { BracketAudienceMode, BracketStatus, BracketVisibility, Bracket, ParallelBracketSource } from "@/lib/brackets/types";

type BracketAudienceSource = Pick<Bracket, "sharingMode" | "visibility">;

export function describeTournamentVisibility(visibility?: BracketVisibility | null) {
  if (visibility === "public_listed") return "Public";
  if (visibility === "public_unlisted") return "Public Unlisted";
  return "Private Draft";
}

export function getTournamentAudienceMode({ sharingMode, visibility }: BracketAudienceSource): BracketAudienceMode {
  if (visibility === "public_listed" || visibility === "public_unlisted") return visibility;
  return sharingMode === "with_friends" ? "with_friends" : "private";
}

export function describeTournamentAudienceMode(tournament: BracketAudienceSource) {
  const labels: Record<BracketAudienceMode, string> = {
    with_friends: "Friends",
    public_listed: "Public",
    public_unlisted: "Public Unlisted",
    private: "Private"
  };
  return labels[getTournamentAudienceMode(tournament)];
}

export function getTournamentAudiencePatch(audienceMode: BracketAudienceMode): Pick<Bracket, "sharingMode" | "visibility"> {
  if (audienceMode === "with_friends") return { sharingMode: "with_friends", visibility: "private" };
  if (audienceMode === "public_listed" || audienceMode === "public_unlisted") return { sharingMode: "private", visibility: audienceMode };
  return { sharingMode: "private", visibility: "private" };
}

export function formatBracketDate(value?: string | Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatBracketRuleLabel(value?: string | null) {
  const staticLabels: Record<string, string> = {
    fixed_bracket: "Fixed Bracket",
    reseed: "Reseed",
    vote_winner: "Vote Winner",
    manual_winner: "Manual Winner",
    higher_seed_wins: "Higher Seed Wins",
    signed_in_only: "Signed In Only",
    with_friends: "Friends"
  };
  return staticLabels[value || ""] || formatResultModeLabel(value);
}

export function isPublicBracketVisibility(visibility?: BracketVisibility | null) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

export function canCopyBracketLink(tournament?: BracketAudienceSource | null) {
  return tournament?.sharingMode === "with_friends" || isPublicBracketVisibility(tournament?.visibility);
}

export function buildDirectBracketSharePath(tournament?: Pick<Bracket, "id" | "status" | "kind"> | null) {
  if (!tournament) return "/";
  if (tournament.status === "complete") return `/results/${tournament.id}`;
  if (tournament.kind === "parallel_parent") return `/vote?parallelBracket=${tournament.id}`;
  return `/vote?bracket=${tournament.id}`;
}

export function normalizeParallelBracketItem(item: ParallelBracketSource): Bracket {
  return {
    ...item,
    kind: "parallel_parent",
    playStyle: "fixed_bracket",
    resultMode: item.resultMode || "parallel_full_ranking",
    entryCount: item.candidateCount ?? 0,
    activeRoundNumber: null,
    activeRoundOpenMatchCount: 0,
    openVoteCount: 0,
    winner: item.winner ?? null,
  } as Bracket;
}

export function sortBrackets<T extends Pick<Bracket, "status" | "createdAt">>(items: T[]) {
  return [...items].sort((left, right) => {
    const statusRank: Record<BracketStatus, number> = { active: 0, draft: 1, complete: 2 };
    const leftRank = statusRank[left.status] ?? 99;
    const rightRank = statusRank[right.status] ?? 99;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}
