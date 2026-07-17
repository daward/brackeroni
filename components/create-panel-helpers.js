"use client";

import { formatResultModeLabel } from "@/lib/bracket-modes";

export function describePoolVisibility(visibility) {
  if (visibility === "public_listed") {
    return "Published";
  }

  if (visibility === "public_unlisted") {
    return "Published Unlisted";
  }

  return "Private Draft";
}

export function PoolPublishWarning({ visibility }) {
  if (visibility === "private") {
    return null;
  }

  return (
    <p className="border border-[var(--accent-2)] bg-[var(--panel-2)] px-4 py-3 text-xs leading-6 text-[var(--accent-2)]">
      Publishing locks this pool. After it is published, only an admin can change its contents or
      settings.
    </p>
  );
}

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
  if (visibility === "public_listed") {
    return "public_listed";
  }

  if (visibility === "public_unlisted") {
    return "public_unlisted";
  }

  if (sharingMode === "with_friends") {
    return "with_friends";
  }

  return "private";
}

export function describeTournamentAudienceMode({ sharingMode, visibility }) {
  const audienceMode = getTournamentAudienceMode({ sharingMode, visibility });

  if (audienceMode === "with_friends") {
    return "Friends";
  }

  if (audienceMode === "public_listed") {
    return "Public";
  }

  if (audienceMode === "public_unlisted") {
    return "Public Unlisted";
  }

  return "Private";
}

export function getTournamentAudiencePatch(audienceMode) {
  if (audienceMode === "with_friends") {
    return {
      sharingMode: "with_friends",
      visibility: "private"
    };
  }

  if (audienceMode === "public_listed") {
    return {
      sharingMode: "private",
      visibility: "public_listed"
    };
  }

  if (audienceMode === "public_unlisted") {
    return {
      sharingMode: "private",
      visibility: "public_unlisted"
    };
  }

  return {
    sharingMode: "private",
    visibility: "private"
  };
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

export function buildPoolImportPrompt(poolName) {
  const trimmedName = poolName.trim();
  const subject = trimmedName ? `"${trimmedName}"` : "the target pool";

  return [
    `Extract a candidate pool for ${subject}.`,
    "Be exhaustive rather than selective.",
    "If the source is a bulleted or numbered list, treat each distinct bullet or list item as a candidate unless it is clearly not one.",
    "Return distinct candidate names only when they are directly supported by the source text.",
    "Prefer canonical names over aliases.",
    "Do not invent candidates or fill gaps with guesses.",
    "If the same candidate appears more than once, include it once.",
    "Keep rationale and excerpt very short so the full list can fit in the response."
  ].join(" ");
}

function normalizeImageMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isStrongSuggestedImageMatch(candidateName, suggestion) {
  const normalizedCandidateName = normalizeImageMatchText(candidateName);
  const normalizedTitle = normalizeImageMatchText(suggestion?.title);

  if (!normalizedCandidateName || !normalizedTitle) {
    return false;
  }

  if (
    normalizedTitle === normalizedCandidateName ||
    normalizedTitle.includes(normalizedCandidateName)
  ) {
    return true;
  }

  const nameTokens = normalizedCandidateName.split(/\s+/).filter(Boolean);

  if (nameTokens.length === 0) {
    return false;
  }

  const matchedTokenCount = nameTokens.filter((token) => normalizedTitle.includes(token)).length;
  const isTrustedSource =
    suggestion?.source === "Wikipedia" || suggestion?.source === "Wikimedia Commons";

  return isTrustedSource && matchedTokenCount === nameTokens.length;
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
    winnerSeed: item.winnerSeed ?? null
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

export function sortManagedPools(items) {
  return [...items].sort((left, right) => {
    const leftOwnedRank = left.isOwned ? 0 : 1;
    const rightOwnedRank = right.isOwned ? 0 : 1;

    if (leftOwnedRank !== rightOwnedRank) {
      return leftOwnedRank - rightOwnedRank;
    }

    const leftUpdatedAt = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightUpdatedAt = new Date(right.updatedAt || right.createdAt || 0).getTime();

    if (leftUpdatedAt !== rightUpdatedAt) {
      return rightUpdatedAt - leftUpdatedAt;
    }

    return left.name.localeCompare(right.name);
  });
}

export function InlineTitleField({ autoFocus = false, value, onChange, onBlur, onKeyDown }) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="-mx-3 block w-[calc(100%+1.5rem)] border border-[var(--line)] bg-transparent px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent-3)]"
      style={{
        fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
        fontSize: "24px",
        fontWeight: 900,
        lineHeight: 1
      }}
    />
  );
}
