/**
 * Public UI surface for the homepage rails.
 *
 * Route code should import featured voting and pool rails from this root rather
 * than coupling to the home feature internals.
 */
export { FeaturedHomeVoteSection } from "./internal/featured-home-matchups";
export { FeaturedHomePools } from "./internal/featured-home-pools";
export type { FeaturedHomeMatchup, FeaturedHomePoolsProps, FeaturedHomeVoteSectionProps } from "./types";
