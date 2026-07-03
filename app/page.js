import Link from "next/link";
import { FeaturedHomePools } from "@/components/featured-home-pools";
import { FeaturedHomeVoteSection } from "@/components/featured-home-matchups";
import { listPublicPools } from "@/lib/data/pools";
import { getFeaturedPublicMatchupsForHomepage } from "@/lib/data/tournaments";

export default async function HomePage() {
  const [featuredPublicMatchups, publicPools] = await Promise.all([
    getFeaturedPublicMatchupsForHomepage({
      limit: 6
    }),
    listPublicPools({ limit: 6, userId: null, featuredOnly: true })
  ]);

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
                Turn any pool into a bracket, then vote or share it.
              </p>
            </div>
          </div>
          <div className="home-hero-card home-import-panel">
            <Link href="/tools/import" className="home-import-link">
              <p className="ui-section-kicker">Bookmarklet Importer</p>
              <p className="home-import-title display-face">Don&apos;t start from scratch!</p>
              <p className="home-import-copy">
                Found a great list, article, or ranking already? Install the bookmarklet and pull
                any web page straight into Brackeroni&apos;s import flow.
              </p>
              <p className="home-import-action">Set Up Import</p>
            </Link>
          </div>
        </div>
      </section>

      <div className="home-feature-grid">
        <section className="home-vote-rail">
          <FeaturedHomeVoteSection items={featuredPublicMatchups} />
        </section>

        <section className="home-pool-rail">
          <div className="home-pool-rail-inner">
            <div className="home-pool-rail-header">
              <div className="home-pool-rail-header-text">
                <h2 className="home-pool-rail-title display-face">
                  <Link href="/pools" className="home-pool-rail-title-link">
                    Published Pools
                  </Link>
                </h2>
              </div>
              <Link href="/pools" className="home-pool-rail-browse ui-button ui-button-primary">
                Browse
              </Link>
            </div>
            <FeaturedHomePools pools={publicPools} />
          </div>
        </section>
      </div>
    </div>
  );
}
