import Link from "next/link";
import { headers } from "next/headers";
import { BookmarkletInstaller } from "@/components/bookmarklet-installer";
import { resolvePreferredOrigin } from "@/lib/app-origin";

export const metadata = {
  title: "Brackeroni for Trip Decisions",
  description: "Use Brackeroni to learn what a group most wants to do on a trip."
};

async function resolveAppOrigin() {
  const requestHeaders = await headers();
  return resolvePreferredOrigin({
    configuredOrigin: process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.APP_ORIGIN,
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    host: requestHeaders.get("host")
  });
}

export default async function TripDecisionsUseCasePage() {
  const origin = await resolveAppOrigin();

  return (
    <div className="mx-auto max-w-5xl">
      <section className="grid gap-0 border border-[var(--line-strong)] lg:min-h-[calc(100vh-11rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-[var(--line-strong)] p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <p className="editorial-kicker">Use Case</p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-none sm:text-5xl">
            Brackeroni for trip decisions
          </h1>
          <p className="ui-copy mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
            You already know where you are going. Use Brackeroni to learn what the group most
            wants to do once you get there.
          </p>
          <div className="mt-6 max-w-lg">
            <BookmarkletInstaller origin={origin} showInstructions={false} />
          </div>
        </div>

        <div className="grid bg-[rgba(255,255,255,0.02)] lg:grid-rows-2">
          <div className="border-b border-[var(--line-strong)] p-6 sm:p-8">
            <p className="ui-section-kicker">Example</p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-none">New York City</h2>
            <p className="ui-copy mt-5 max-w-md text-base leading-7 text-[var(--muted)]">
              Open Tripadvisor, import a New York City list, then run parallel brackets for
              museums, food, and major sights.
            </p>
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <p className="ui-section-kicker">How It Works</p>
              <ol className="mt-4 grid gap-4">
                <li className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <span className="display-face text-3xl font-black leading-none text-[var(--accent-2)]">
                    1
                  </span>
                  <p className="ui-copy text-base leading-7 text-[var(--muted)]">
                    Import the attractions to a pool.
                  </p>
                </li>
                <li className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <span className="display-face text-3xl font-black leading-none text-[var(--accent-2)]">
                    2
                  </span>
                  <p className="ui-copy text-base leading-7 text-[var(--muted)]">
                    Set up a bracket. We recommend parallel.
                  </p>
                </li>
                <li className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <span className="display-face text-3xl font-black leading-none text-[var(--accent-2)]">
                    3
                  </span>
                  <p className="ui-copy text-base leading-7 text-[var(--muted)]">
                    Vote with your fellow travelers.
                  </p>
                </li>
              </ol>
              <p className="ui-meta mt-6 max-w-sm text-[var(--accent-3)]">
                See what your group wants to do most.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/create?newBracket=1&sharingMode=with_friends&visibility=private&resultMode=parallel_full_ranking"
                className="ui-button ui-button-accent"
              >
                Create a bracket
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
