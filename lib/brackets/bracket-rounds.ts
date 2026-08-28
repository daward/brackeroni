import * as rounds from "@/lib/brackets/internal/rounds";

type ListBracketRoundsOptions = Parameters<typeof rounds.listRoundsForTournament>[0];
type RevealBracketRoundOptions = Parameters<typeof rounds.revealTournamentRound>[0];

export function bracketRounds() {
  return {
    list: (options: ListBracketRoundsOptions) => rounds.listRoundsForTournament(options),
    reveal: (options: RevealBracketRoundOptions) => rounds.revealTournamentRound(options),
  };
}
