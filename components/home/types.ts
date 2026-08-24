/** Public contracts for home-page feature rails and homepage teasers. */
import type { PublicPool } from "@/lib/pools/types";

export type FeaturedHomeMatchup = {
  tournamentId: string;
  tournamentTitle: string;
  roundNumber: number;
  matchId: string;
  leftEntryId?: string | null;
  leftSeed?: number | null;
  leftName: string;
  leftImageUrl?: string | null;
  rightEntryId?: string | null;
  rightSeed?: number | null;
  rightName: string;
  rightImageUrl?: string | null;
  hasUserVote?: boolean;
  voteHref?: string | null;
};

export type FeaturedHomeVoteSectionProps = {
  items?: FeaturedHomeMatchup[] | null;
};

export type FeaturedHomePoolsProps = {
  pools?: PublicPool[] | null;
  signedIn?: boolean;
};
