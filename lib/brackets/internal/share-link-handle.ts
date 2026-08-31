import type { BracketShareTokenOptions } from "@/lib/brackets/types";
import { getParallelBracketByShareToken } from "@/lib/brackets/internal/stateful-workflows/parallel-bracket-records";
import { getTournamentByShareToken } from "@/lib/brackets/internal/tournament-sharing";

export function shareLink(options: BracketShareTokenOptions) {
  const identity = {
    token: options.token,
    userId: options.userId ?? null,
  };

  return {
    getTarget: async () => {
      try {
        const standard = await getTournamentByShareToken(identity);
        return {
          ...standard,
          bracketType: "standard",
          votePath: `/vote?bracket=${standard.tournamentId}`,
          resultsPath: `/results/${standard.tournamentId}`,
        };
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "NOT_FOUND") {
          throw error;
        }
      }

      const parallel = await getParallelBracketByShareToken(identity);
      return {
        ...parallel,
        bracketType: "parallel_parent",
        votePath: `/vote?parallelBracket=${parallel.parallelTournamentId}`,
        resultsPath: `/results/${parallel.parallelTournamentId}`,
      };
    },
  };
}
