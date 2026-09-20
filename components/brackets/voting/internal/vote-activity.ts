import type { VoteTournament } from "./voting-internal-types";

function getActivityTime(tournament: VoteTournament) {
  const value = tournament.lastVoteAt ?? tournament.completedAt ?? tournament.updatedAt ?? tournament.createdAt;
  const isDateValue = typeof value === "string" || typeof value === "number" || value instanceof Date;
  const time = isDateValue ? new Date(value).getTime() : 0;

  return Number.isFinite(time) ? time : 0;
}

export function sortVoteTournamentsByRecentActivity(tournaments: VoteTournament[]) {
  return [...tournaments].sort((left, right) => {
    const activityDifference = getActivityTime(right) - getActivityTime(left);

    if (activityDifference !== 0) {
      return activityDifference;
    }

    return String(left.title || "").localeCompare(String(right.title || ""));
  });
}
