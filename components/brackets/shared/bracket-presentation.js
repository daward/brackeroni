import { formatResultModeLabel } from "@/lib/bracket-modes";

export function describeTournamentVisibility(visibility) {
  if (visibility === "public_listed") {
    return "Public";
  }

  if (visibility === "public_unlisted") {
    return "Public Unlisted";
  }
  return "Private Draft";
}

export function getTournamentAudienceMode({ sharingMode, visibility }) {
  if (visibility === "public_listed" || visibility === "public_unlisted") {
    return visibility;
  }

  return sharingMode === "with_friends" ? "with_friends" : "private";
}

export function describeTournamentAudienceMode(tournament) {
  const audienceMode = getTournamentAudienceMode(tournament);
  const labels = {
    with_friends: "Friends",
    public_listed: "Public",
    public_unlisted: "Public Unlisted",
    private: "Private"
  };

  return labels[audienceMode];
}

export function getTournamentAudiencePatch(audienceMode) {
  if (audienceMode === "with_friends") {
    return { sharingMode: "with_friends", visibility: "private" };
  }

  if (audienceMode === "public_listed" || audienceMode === "public_unlisted") {
    return { sharingMode: "private", visibility: audienceMode };
  }
  return { sharingMode: "private", visibility: "private" };
}

export function TournamentPublishWarning({ visibility }) {
  if (visibility === "private") {
    return null;
  }
  return (
    <p className="border border-[var(--accent-2)] bg-[var(--panel-2)] px-4 py-3 text-xs leading-6 text-[var(--accent-2)]">
      Public brackets stay editable until you start them. Starting the bracket publishes it and
      locks further create changes.
    </p>
  );
}

export function formatBracketDate(value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatBracketRuleLabel(value) {
  const staticLabels = {
    fixed_bracket: "Fixed Bracket",
    reseed: "Reseed",
    vote_winner: "Vote Winner",
    manual_winner: "Manual Winner",
    higher_seed_wins: "Higher Seed Wins",
    signed_in_only: "Signed In Only",
    with_friends: "Friends"
  };
  return staticLabels[value] || formatResultModeLabel(value);
}

export function isPublicBracketVisibility(visibility) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

export function canCopyBracketLink(tournament) {
  return tournament?.sharingMode === "with_friends" || isPublicBracketVisibility(tournament?.visibility);
}

export function buildDirectBracketSharePath(tournament) {
  if (!tournament) {
    return "/";
  }

  if (tournament.status === "complete") {
    return `/results/${tournament.id}`;
  }

  if (tournament.kind === "parallel_parent") {
    return `/vote?parallelTournament=${tournament.id}`;
  }
  return `/vote?tournament=${tournament.id}`;
}

export function normalizeParallelBracketItem(item) {
  return {
    ...item,
    kind: "parallel_parent",
    playStyle: "fixed_bracket",
    resultMode: item.resultMode || "parallel_full_ranking",
    entryCount: item.candidateCount ?? 0,
    activeRoundNumber: null,
    activeRoundOpenMatchCount: 0,
    openVoteCount: 0,
    winnerEntryId: item.winnerEntryId ?? null,
    winnerName: item.winnerName ?? null,
    winnerSeed: item.winnerSeed ?? null,
    winnerImageUrl: item.winnerImageUrl ?? null
  };
}

export function sortManagedBrackets(items) {
  return [...items].sort((left, right) => {
    const statusRank = {
      active: 0,
      draft: 1,
      complete: 2
    };
    const leftRank = statusRank[left.status] ?? 99;
    const rightRank = statusRank[right.status] ?? 99;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}
