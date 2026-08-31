import type { BracketMatchHandle, BracketMatchHandleOptions } from "@/lib/brackets/types";
import { setBracketMatchManualWinner } from "@/lib/brackets/internal/matches";
import { recordBracketMatchVote } from "@/lib/brackets/internal/tournament-lifecycle";

type SetManualWinner = (options: {
  matchId: string;
  creatorUserId?: string;
  winnerEntryId: string | null;
}) => ReturnType<BracketMatchHandle["setManualWinner"]>;

type RecordVote = (options: {
  matchId: string;
  userId?: string | null;
  anonymousVoterToken?: string | null;
  selectedEntryId: string;
}) => ReturnType<BracketMatchHandle["recordVote"]>;

const setManualWinner = setBracketMatchManualWinner as unknown as SetManualWinner;
const recordVote = recordBracketMatchVote as unknown as RecordVote;

export function match(options: BracketMatchHandleOptions): BracketMatchHandle {
  const identity = {
    matchId: options.matchId,
    creatorUserId: options.creatorUserId,
    userId: options.userId ?? null,
    anonymousVoterToken: options.anonymousVoterToken ?? null,
  };

  return {
    setManualWinner: (winnerEntryId) =>
      setManualWinner({
        matchId: identity.matchId,
        creatorUserId: identity.creatorUserId,
        winnerEntryId,
      }),
    recordVote: (selectedEntryId) =>
      recordVote({
        matchId: identity.matchId,
        userId: identity.userId,
        anonymousVoterToken: identity.anonymousVoterToken,
        selectedEntryId,
      }),
  };
}
