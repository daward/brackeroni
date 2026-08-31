import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { cookies } from "next/headers";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { BracketOutcomeNav, BracketProgressPage, supportsRoundProgressView } from "@/components/brackets";
import { bracket } from "@/lib/brackets";
import { parallelBracketDirectory } from "@/lib/brackets";
import { bracketDirectory } from "@/lib/brackets";
import { ParallelResultsPage, ResultsLinkedViewSelect, TournamentScoringPage, TournamentResultsPage } from "@/components/brackets";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { bracketId } = await params;

  return {
    title: `Results | ${bracketId} | Brackeroni`,
  };
}

function normalizeStandardView(view, tournament) {
  const isParallelChildResult = Boolean(tournament.parentParallelTournamentId);
  const canShowRounds = !isParallelChildResult && supportsRoundProgressView(tournament.resultMode);
  const defaultView = tournament.status === "complete" || !canShowRounds ? "results" : "rounds";

  if (view === "results" || view === "scoring") {
    return view;
  }

  if (view === "rounds" && canShowRounds) {
    return view;
  }

  return defaultView;
}

export default async function TournamentResultsRoute({ params, searchParams }) {
  const { bracketId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedView = typeof resolvedSearchParams.view === "string" ? resolvedSearchParams.view : null;
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;

  try {
    const tournament = await bracketDirectory().getAccessibleBracketById({
      bracketId: bracketId,
      userId: user?.id ?? null,
      anonymousVoterToken,
    });
    const currentBracket = bracket({
      bracketId: bracketId,
      userId: user?.id ?? null,
      anonymousVoterToken,
    });
    const selectedView = normalizeStandardView(requestedView, tournament);

    const isParallelChildResult = Boolean(tournament.parentParallelTournamentId);
    const canShowRounds = !isParallelChildResult && supportsRoundProgressView(tournament.resultMode);
    const canShowScoring = !tournament.parentParallelTournamentId;
    const viewNav = (
      <BracketOutcomeNav
        bracketId={tournament.id}
        activeView={selectedView}
        showResults
        showRounds={canShowRounds}
        showScoring={canShowScoring}
        disabledReasonByKey={
          tournament.status === "complete" || selectedView === "results"
            ? {}
            : {
                results: "Bracket results are only available after the bracket closes. Use Rounds while voting is still in progress.",
              }
        }
      />
    );
    if (selectedView === "scoring" && canShowScoring) {
      const voterScoreboard = await currentBracket.listVoterScores({
        bracket: tournament,
        includeVoteHistory: true,
      });

      return (
        <TournamentScoringPage
          tournament={tournament}
          voterScores={voterScoreboard.scores}
          voteHistoryByVoterKey={voterScoreboard.voteHistoryByVoterKey}
          canInspectAllVoterScores={voterScoreboard.canInspectAllScores}
          scoringEnabled={voterScoreboard.scoringEnabled}
          outcomeNav={viewNav}
        />
      );
    }

    const matchResult = await currentBracket.listMatches();
    const matches = matchResult.matches ?? [];

    if (selectedView === "rounds") {
      const rounds = await currentBracket.listRounds();
      const isCreator = Boolean(user?.id && tournament.creatorUserId === user.id);

      return <BracketProgressPage tournament={tournament} rounds={rounds} matches={matches} isCreator={isCreator} outcomeNav={viewNav} />;
    }

    return (
      <TournamentResultsPage
        tournament={tournament}
        matches={matches}
        outcomeNav={viewNav}
        headerAction={
          isParallelChildResult ? (
            <ResultsLinkedViewSelect
              value="ballot"
              options={[
                { value: "ballot", label: "My Ballot", href: `/results/${tournament.id}` },
                {
                  value: "overall",
                  label: "Overall Bracket",
                  href: `/results/${tournament.parentParallelTournamentId}`,
                },
              ]}
            />
          ) : null
        }
        headerNotice={
          !isParallelChildResult && tournament.status === "active" ? (
            <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {supportsRoundProgressView(tournament.resultMode) ? "You already voted in the currently available matchup for this bracket." : "This ranking is still being decided."}
              <span className="ml-2">
                {supportsRoundProgressView(tournament.resultMode)
                  ? "These are the live results while voting continues."
                  : "Final positions will appear here when the ranking closes."}
              </span>
            </div>
          ) : null
        }
      />
    );
  } catch (standardError) {
    if (standardError?.message === "NOT_FOUND") {
      console.warn("[results] Tournament unavailable", {
        bracketId,
        requestedView,
        hasAuthenticatedUser: Boolean(user?.id),
        hasAnonymousVoterToken: Boolean(anonymousVoterToken),
      });
    }

    if (standardError?.message !== "NOT_FOUND") {
      throw standardError;
    }

    try {
      const parallelResults = await parallelBracketDirectory().getAggregateResults({
        parallelBracketId: bracketId,
        userId: user?.id ?? null,
        anonymousVoterToken,
      });
      const participants = (parallelResults.participants ?? []).map((participant) => ({
        ...participant,
        matches: participant.matches ?? [],
      }));

      return (
        <ParallelResultsPage
          tournament={parallelResults.tournament}
          aggregateEntries={parallelResults.aggregateEntries}
          participants={participants}
          completedBallotCount={parallelResults.completedBallotCount}
          canInspectAllParticipants={parallelResults.canInspectAllParticipants}
        />
      );
    } catch {
      if (standardError?.message === "PARALLEL_TOURNAMENTS_REQUIRES_MIGRATION") {
        throw standardError;
      }

      notFound();
    }
  }
}
