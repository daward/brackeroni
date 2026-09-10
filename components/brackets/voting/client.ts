"use client";

/**
 * Client-safe voting UI used outside the `/vote` route.
 *
 * Do not export the server vote page from this entry point.
 */
export { VoteMatchModal } from "./internal/vote-match-modal";
export { getCurrentRoundProgress, openMatchesForTournament } from "./internal/vote-match-state";
export type { VoteMatch, VoteTournament } from "./internal/voting-internal-types";
