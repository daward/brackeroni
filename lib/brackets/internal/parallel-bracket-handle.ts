import type { BracketOwnerHandle, ParallelBracketHandleOptions } from "@/lib/brackets/types";

import {
  archiveParallelBracket,
  ensureParallelBracketShareLink,
  listParallelBracketShareLinks,
  rotateParallelBracketShareLink,
  updateParallelBracket,
} from "@/lib/brackets/internal/stateful-workflows/parallel-bracket-records";

export function parallelBracket({
  parallelBracketId,
  creatorUserId,
}: ParallelBracketHandleOptions): BracketOwnerHandle {
  const identity = { parallelTournamentId: parallelBracketId, creatorUserId };

  return {
    update: (patch) => updateParallelBracket({ ...identity, patch }),
    archive: () => archiveParallelBracket(identity),
    listShareLinks: () => listParallelBracketShareLinks(identity),
    ensureShareLink: () => ensureParallelBracketShareLink(identity),
    rotateShareLink: () => rotateParallelBracketShareLink(identity),
  };
}
