import { recordTournamentVote } from "@/lib/brackets/internal/tournament-lifecycle";

type RecordBracketVoteOptions = Parameters<typeof recordTournamentVote>[0];

export function bracketVoting() {
  return {
    recordVote: (options: RecordBracketVoteOptions) => recordTournamentVote(options),
  };
}
