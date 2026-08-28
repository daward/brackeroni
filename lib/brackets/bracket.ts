import type { BracketHandle, BracketHandleOptions } from "@/lib/brackets/types";

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

export function bracket({ tournamentId, creatorUserId }: BracketHandleOptions): BracketHandle {
  const identity = { tournamentId, creatorUserId };

  return {
    get: () => getTournamentById(identity),
    update: (patch) => updateTournament({ ...identity, patch }),
    archive: () => archiveTournament(identity),
    createRerun: () => createTournamentRerun(identity),
    updateEntries: ({ entries, seedingStructure = {} }) =>
      updateTournamentEntries({
        ...identity,
        entries,
        seedingStructure,
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
