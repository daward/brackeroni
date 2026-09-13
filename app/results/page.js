import { cookies } from "next/headers";
import { CompletedBracketCard } from "@/components/brackets";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { bracketDirectory, parallelBracketDirectory } from "@/lib/brackets";

export const metadata = { title: "Results | Brackeroni" };
export const dynamic = "force-dynamic";

const RESULT_LIMIT = 24;

function normalizeParallelResult(item, personal = false, badgeLabel = null) {
  return {
    ...item,
    kind: "parallel_parent",
    entryCount: item.entryCount ?? item.candidateCount ?? 0,
    isPersonalResult: personal,
    resultBadgeLabel: badgeLabel,
  };
}

function normalizeStandardResult(item, personal = false, badgeLabel = null) {
  return {
    ...item,
    kind: "standard",
    isPersonalResult: personal,
    resultBadgeLabel: badgeLabel,
  };
}

function getResultHref(item) {
  if (item.kind === "parallel_parent" && item.viewerBracketId) {
    return `/results/${item.viewerBracketId}`;
  }

  return `/results/${item.id}`;
}

function sortResults(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.completedAt || left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.completedAt || right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function getBadgePriority(item) {
  if (item.resultBadgeLabel === "Created by you") {
    return 3;
  }

  if (item.resultBadgeLabel === "Your ballot") {
    return 2;
  }

  if (item.resultBadgeLabel === "You voted") {
    return 1;
  }

  return 0;
}

function dedupeResults(items) {
  const results = new Map();

  for (const item of items) {
    const existing = results.get(item.id);

    if (!existing || getBadgePriority(item) > getBadgePriority(existing)) {
      results.set(item.id, item);
    }
  }

  return [...results.values()];
}

function ResultsGrid({ items }) {
  if (items.length === 0) {
    return (
      <div className="workspace-empty-state">
        <p className="workspace-empty-copy">No completed brackets yet.</p>
      </div>
    );
  }

  return (
    <div className="workspace-card-grid">
      {items.map((item) => (
        <CompletedBracketCard
          key={`${item.kind}:${item.id}`}
          tournament={item}
          as="a"
          href={getResultHref(item)}
          badgeLabel={item.resultBadgeLabel}
        />
      ))}
    </div>
  );
}

export default async function ResultsIndexPage() {
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;
  const standardDirectory = bracketDirectory();
  const parallelDirectory = parallelBracketDirectory();

  const [
    ownedStandard,
    votedStandard,
    publicStandard,
    accessibleParallel,
    publicParallel,
  ] = await Promise.all([
    user
      ? standardDirectory.listAccessibleBrackets({
          userId: user.id,
          statuses: ["complete"],
          limit: RESULT_LIMIT,
          offset: 0,
        })
      : Promise.resolve([]),
    user || anonymousVoterToken
      ? standardDirectory.listVotedBrackets({
          userId: user?.id ?? null,
          anonymousVoterToken,
          statuses: ["complete"],
          limit: RESULT_LIMIT,
          offset: 0,
        })
      : Promise.resolve([]),
    standardDirectory.listPublicBrackets({
      statuses: ["complete"],
      limit: RESULT_LIMIT,
      offset: 0,
    }),
    user || anonymousVoterToken
      ? parallelDirectory.listAccessibleBrackets({
          userId: user?.id ?? null,
          anonymousVoterToken,
          statuses: ["complete"],
          limit: RESULT_LIMIT,
          offset: 0,
        })
      : Promise.resolve([]),
    parallelDirectory.listPublicBrackets({
      statuses: ["complete"],
      limit: RESULT_LIMIT,
      offset: 0,
    }),
  ]);

  const personalResults = sortResults(dedupeResults([
    ...ownedStandard.map((item) => normalizeStandardResult(
      item,
      true,
      item.creatorUserId === user?.id ? "Created by you" : "You voted",
    )),
    ...votedStandard.map((item) => normalizeStandardResult(item, true, "You voted")),
    ...accessibleParallel.map((item) => normalizeParallelResult(
      item,
      true,
      item.creatorUserId === user?.id ? "Created by you" : item.viewerBracketId ? "Your ballot" : "You voted",
    )),
  ]));
  const personalIds = new Set(personalResults.map((item) => item.id));
  const publicResults = sortResults(dedupeResults([
    ...publicStandard.map((item) => normalizeStandardResult(item)),
    ...publicParallel.map((item) => normalizeParallelResult(item)),
  ])).filter((item) => !personalIds.has(item.id));

  return (
    <div className="space-y-8">
      <section className="border-b border-[var(--line-strong)] pb-3">
        <p className="ui-section-kicker">Results</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="display-face text-2xl font-black uppercase sm:text-3xl">Completed Brackets</h1>
          <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            {personalResults.length} yours · {publicResults.length} public
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="ui-section-kicker">Your Results</h2>
        <ResultsGrid items={personalResults} />
      </section>

      <section className="space-y-3">
        <h2 className="ui-section-kicker">Public Results</h2>
        <ResultsGrid items={publicResults} />
      </section>
    </div>
  );
}
