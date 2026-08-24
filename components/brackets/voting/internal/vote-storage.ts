const LAST_OPEN_VOTE_TOURNAMENT_KEY = "brackeroni-last-open-vote-tournament";

export function readStoredFocusedTournamentId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(LAST_OPEN_VOTE_TOURNAMENT_KEY);
  } catch {
    return null;
  }
}

export function writeStoredFocusedTournamentId(tournamentId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (tournamentId) {
      window.sessionStorage.setItem(LAST_OPEN_VOTE_TOURNAMENT_KEY, tournamentId);
    } else {
      window.sessionStorage.removeItem(LAST_OPEN_VOTE_TOURNAMENT_KEY);
    }
  } catch {}
}
