import type { Bracket, BracketHandle, BracketHandleOptions } from "@/lib/brackets/types";
import { normalizeFlatBracketWinner } from "@/lib/brackets/internal/bracket-records";
import type { FlatBracketWinnerRecord } from "@/lib/brackets/internal/bracket-records";
import { normalizeFlatBracketMatches } from "@/lib/brackets/internal/match-records";
import type { FlatBracketMatchRecord } from "@/lib/brackets/internal/match-records";

import {
  applyTournamentLifecyclePatch,
  closeTournamentRound,
  openTournamentRound,
} from "@/lib/brackets/internal/tournament-lifecycle";
import {
  archiveTournament,
  createTournamentRerun,
  updateTournament,
  updateTournamentEntries,
} from "@/lib/brackets/internal/tournament-mutations";
import { getTournamentById } from "@/lib/brackets/internal/tournament-access";
import {
  ensureTournamentShareLink,
  listTournamentInvites,
  listTournamentShareLinks,
  rotateTournamentShareLink,
} from "@/lib/brackets/internal/tournament-sharing";
import {
  listBracketMatches,
  listBracketVoterScores,
} from "@/lib/brackets/internal/matches";
import { listRoundsForTournament } from "@/lib/brackets/internal/rounds";

type BracketViewerIdentity = {
  tournamentId: string;
  creatorUserId?: string;
  userId?: string | null;
  anonymousVoterToken?: string | null;
};

const listMatches = listBracketMatches as unknown as (options: BracketViewerIdentity) => Promise<{
  tournament: FlatBracketWinnerRecord;
  matches: FlatBracketMatchRecord[];
}>;
const listRounds = listRoundsForTournament as unknown as (options: Pick<BracketViewerIdentity, "tournamentId" | "userId">) => ReturnType<BracketHandle["listRounds"]>;
const listVoterScores = listBracketVoterScores as unknown as (
  options: Pick<BracketViewerIdentity, "userId" | "anonymousVoterToken"> & {
    tournament: Parameters<BracketHandle["listVoterScores"]>[0]["bracket"];
    includeVoteHistory?: boolean;
  },
) => ReturnType<BracketHandle["listVoterScores"]>;

export function bracket({ bracketId, creatorUserId, userId = null, anonymousVoterToken = null }: BracketHandleOptions): BracketHandle {
  const identity = { tournamentId: bracketId, creatorUserId };
  const viewerIdentity = {
    tournamentId: bracketId,
    creatorUserId,
    userId,
    anonymousVoterToken,
  };

  return {
    get: async () => normalizeFlatBracketWinner(await getTournamentById(identity)) as Awaited<ReturnType<BracketHandle["get"]>>,
    update: async (patch) => normalizeFlatBracketWinner(await updateTournament({ ...identity, patch })) as Awaited<ReturnType<BracketHandle["update"]>>,
    archive: () => archiveTournament(identity),
    createRerun: async () => normalizeFlatBracketWinner(await createTournamentRerun(identity)) as Awaited<ReturnType<BracketHandle["createRerun"]>>,
    updateEntries: ({ entries, seedingStructure = {} }) =>
      updateTournamentEntries({
        ...identity,
        entries,
        seedingStructure,
      }).then((result) => normalizeFlatBracketWinner(result) as Awaited<ReturnType<BracketHandle["updateEntries"]>>),
    listMatches: async () => {
      const result = await listMatches(viewerIdentity);
      return {
        bracket: normalizeFlatBracketWinner(result.tournament) as Bracket,
        matches: normalizeFlatBracketMatches(result.matches),
      };
    },
    listRounds: () => listRounds({ tournamentId: bracketId, userId }),
    listVoterScores: ({ bracket, includeVoteHistory = false }) =>
      listVoterScores({
        tournament: bracket,
        userId,
        anonymousVoterToken,
        includeVoteHistory,
      }),
    closeCurrentRound: () => closeTournamentRound(identity),
    openNextRound: () => openTournamentRound(identity),
    applyLifecyclePatch: (patch) => applyTournamentLifecyclePatch({ ...identity, patch }),
    listInvites: () => listTournamentInvites(identity),
    listShareLinks: () => listTournamentShareLinks(identity),
    ensureShareLink: () => ensureTournamentShareLink(identity),
    rotateShareLink: () => rotateTournamentShareLink(identity),
  };
}
