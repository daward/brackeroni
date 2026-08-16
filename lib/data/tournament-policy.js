export function isPublicTournamentVisibility(visibility) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

export function getRoundClosureModeForAudience({ sharingMode, visibility }) {
  if (isPublicTournamentVisibility(visibility)) {
    return "manual";
  }

  if (sharingMode === "with_friends") {
    return "all_votes_received";
  }

  return "automatic_when_settled";
}
