import * as matches from "@/lib/brackets/internal/matches";

type ListBracketMatchesOptions = Parameters<typeof matches.listMatchesForTournament>[0];
type ListBracketVoterScoresOptions = Parameters<typeof matches.listTournamentVoterScores>[0];
type SetManualWinnerOptions = Parameters<typeof matches.setManualMatchWinner>[0];

export function bracketMatches() {
  return {
    list: (options: ListBracketMatchesOptions) => matches.listMatchesForTournament(options),
    listVoterScores: (options: ListBracketVoterScoresOptions) => matches.listTournamentVoterScores(options),
    setManualWinner: (options: SetManualWinnerOptions) => matches.setManualMatchWinner(options),
  };
}
