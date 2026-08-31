import type { BracketRoundHandle, BracketRoundHandleOptions } from "@/lib/brackets/types";
import { revealTournamentRound } from "@/lib/brackets/internal/rounds";

export function round(options: BracketRoundHandleOptions): BracketRoundHandle {
  return {
    reveal: () => revealTournamentRound(options),
  };
}
