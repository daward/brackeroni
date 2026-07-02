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
    <div className="space-y-4">
      <section className="hidden border border-[var(--line)] bg-[var(--panel)] lg:block">
        <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[1.3fr_0.7fr]">
          <div className="flex h-full flex-col items-center justify-center bg-[var(--panel)] px-6 py-3 sm:px-5 sm:py-4">
            <img
              src="/bracket_hero_first_style_no_spark1.svg?v=3"
              alt="Make decisions, settle debates, build brackets"
              className="block w-full max-w-[36rem] translate-y-1"
            />
            <p className="mt-3 text-center text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
              Turn any pool into a bracket, then vote or share it.
            </p>
          </div>
          <div className="bg-[var(--panel-3)] p-0">
            <Link
              href="/tools/import"
              className="flex h-full flex-col justify-start bg-[linear-gradient(180deg,rgba(52,211,196,0.08),transparent_45%),var(--panel-3)] px-5 py-4 transition hover:bg-[linear-gradient(180deg,rgba(52,211,196,0.14),transparent_45%),var(--panel)] sm:px-6 sm:py-5"
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                Bookmarklet Importer
              </p>
              <p className="mt-2 display-face text-lg font-black">Don&apos;t start from scratch!</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Found a great list, article, or ranking already? Install the bookmarklet and pull
                any web page straight into Brackeroni&apos;s import flow.
              </p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
                Set Up Import
              </p>
            </Link>
          </div>
        </div>
      </section>

      <div className="xl:grid xl:grid-cols-[1.08fr_0.92fr] xl:gap-6">
        <section className="border border-[var(--line)] bg-[var(--panel)] shadow-[0_0_0_1px_rgba(52,211,196,0.08)_inset,0_18px_36px_rgba(0,0,0,0.18)]">
          <FeaturedHomeVoteSection items={featuredPublicMatchups} />
        </section>

        <section className="mt-4 border border-[var(--line)] bg-[var(--panel)] xl:mt-0">
          <div className="flex min-h-full flex-col bg-[var(--panel)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                  Start from a published pool
                </p>
                <h2 className="display-face mt-2 text-3xl font-black">
                  <Link href="/pools" className="transition hover:text-[var(--accent-3)]">
                    Make Your Own Bracket
                  </Link>
                </h2>
              </div>
              <Link
                href="/pools"
                className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)] transition hover:text-[var(--accent-2)]"
              >
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
