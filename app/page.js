import Link from "next/link";

const primaryAreas = [
  {
    title: "Vote",
    description: "Open rounds, settled rounds, and the decisions that still need your click.",
    href: "/vote"
  },
  {
    title: "Create",
    description: "Build pools, shape brackets, and line up the field before voting begins.",
    href: "/create"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[1.3fr_0.7fr]">
          <div className="bg-[var(--panel)] px-10 py-6 sm:px-7 sm:py-8">
            <img
              src="/bracket_hero_first_style_no_spark1.svg"
              alt="Make decisions, settle debates, build brackets"
              className="mt-2 w-full max-w-4xl"
            />
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
              Brackeroni lets you answer questions by building brackets and sharing them with others.
              Its the best way to make a group decision.
            </p>
          </div>
          <div className="bg-[var(--panel-3)] px-5 py-6 sm:px-7 sm:py-8">
            <div className="mt-5 space-y-4">
              <Link
                href="/create"
                className="block border border-[var(--accent-3)] bg-[var(--panel)] px-4 py-4 transition hover:bg-[rgba(52,211,196,0.15)]"
              >
                <p className="display-face text-lg font-black">Create a bracket</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Build or edit candidate pools, set the bracket rules, and get voting ready.
                </p>
              </Link>
              <Link
                href="/vote"
                className="block border border-[var(--accent-2)] bg-[var(--panel)] px-4 py-4 transition hover:bg-[rgba(255,216,77,0.15)]"
              >
                <p className="display-face text-lg font-black">Jump into voting</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Review active brackets, cast votes, and check completed results.
                </p>
              </Link>
              <Link
                href="/tools/import"
                className="block border border-[var(--accent-3)] bg-[var(--panel)] px-4 py-4 transition hover:bg-[rgba(52,211,196,0.15)]"
              >
                <p className="display-face text-lg font-black">Don&apos;t start from scratch!</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Found a great list, article, or ranking already? Install the bookmarklet and
                  pull any web page straight into Brackeroni&apos;s import flow.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
