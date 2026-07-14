import Link from "next/link";
import { FeaturedHomePools } from "@/components/featured-home-pools";
import { FeaturedHomeVoteSection } from "@/components/featured-home-matchups";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { getFeaturedParallelTeaserMatchups } from "@/lib/data/parallel-tournaments";
import { listPublicPools } from "@/lib/data/pools";
import { getFeaturedPublicMatchupsForHomepage } from "@/lib/data/tournaments";

export default async function HomePage() {
  const user = await getOptionalCurrentUser();
  const [featuredPublicMatchups, featuredParallelMatchups, publicPools] = await Promise.all([
    getFeaturedPublicMatchupsForHomepage({
      limit: 6
    }),
    getFeaturedParallelTeaserMatchups({
      limit: 6
    }),
    listPublicPools({ limit: 6, userId: null, featuredOnly: true })
  ]);

  const normalizedPublicMatchups = featuredPublicMatchups.map((item) => ({
    ...item,
    voteHref: `/vote?tournament=${item.tournamentId}`
  }));
  const normalizedParallelMatchups = featuredParallelMatchups.map((item) => ({
    tournamentId: item.parallelTournamentId,
    tournamentTitle: item.parallelTournamentTitle,
    roundNumber: 1,
    matchId: `${item.parallelTournamentId}:teaser`,
    leftEntryId: item.leftCandidateId,
    leftSeed: item.leftSeed,
    leftName: item.leftName,
    leftImageUrl: item.leftImageUrl,
    rightEntryId: item.rightCandidateId,
    rightSeed: item.rightSeed,
    rightName: item.rightName,
    rightImageUrl: item.rightImageUrl,
    hasUserVote: false,
    voteHref: `/vote?parallelTournament=${item.parallelTournamentId}`
  }));

  const combinedFeaturedMatchups = [
    ...normalizedPublicMatchups.slice(0, 4),
    ...normalizedParallelMatchups.slice(0, 2),
    ...normalizedPublicMatchups.slice(4),
    ...normalizedParallelMatchups.slice(2)
  ].slice(0, 6);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-grid">
          <div className="home-hero-card home-hero-graphic-card">
            <div className="home-hero-visual">
              <img
                src="/bracket_hero_first_style_no_spark1.svg?v=3"
                alt="Make decisions, settle debates, build brackets"
                className="home-hero-image"
              />
              <p className="home-hero-tagline">
                In a world of choice, take it one matchup at a time.
              </p>
            </div>
          </div>
          <div className="home-hero-card home-import-panel">
            <Link href="/tools/import" className="home-import-link">
              <p className="ui-section-kicker">Import a Pool</p>
              <p className="home-import-title display-face">
                Turn any guide, ranking, or events page into a pool.
              </p>
              <p className="home-import-copy">
                Found a travel guide, best-of list, weekend calendar, or activity page? Pull it
                into Brackeroni, then vote it down to a winner, shortlist, or group favorite.
              </p>
              <p className="home-import-action">Start Importing</p>
            </Link>
          </div>
        </div>
      </section>

      <div className="home-feature-grid">
        <section className="home-vote-rail">
          <div className="home-vote-rail-header">
            <div className="home-vote-rail-header-text">
              <h2 className="home-vote-rail-title display-face">
                <span className="home-rail-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="home-rail-title-icon-svg" fill="none">
                    <rect x="2.5" y="5.5" width="6" height="13" rx="1" />
                    <rect x="15.5" y="5.5" width="6" height="13" rx="1" />
                    <path d="M8.5 9.5h7" />
                    <path d="M8.5 14.5h7" />
                    <path d="M12 9.5v5" />
                  </svg>
                </span>
                Try a Quick Matchup
              </h2>
            </div>
          </div>
          <FeaturedHomeVoteSection items={combinedFeaturedMatchups} />
        </section>

        <section className="home-pool-rail">
          <div className="home-pool-rail-inner">
            <div className="home-pool-rail-header">
              <div className="home-pool-rail-header-text">
                <h2 className="home-pool-rail-title display-face">
                  <span className="home-rail-title-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="home-rail-title-icon-svg" fill="none">
                      <rect x="3" y="5" width="6" height="6" rx="1" />
                      <rect x="3" y="13" width="6" height="6" rx="1" />
                      <path d="M13 7.5h8" />
                      <path d="M13 11h6" />
                      <path d="M13 15.5h8" />
                      <path d="M13 19h6" />
                    </svg>
                  </span>
                  Start From a Pool
                </h2>
              </div>
              <Link href="/pools" className="home-pool-rail-browse ui-button ui-button-primary">
                Browse
              </Link>
            </div>
            <FeaturedHomePools pools={publicPools} signedIn={Boolean(user)} />
          </div>
        </section>
      </div>
    </div>
  );
}
