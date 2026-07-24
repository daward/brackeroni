import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { cookies } from "next/headers";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { BracketOutcomeNav } from "@/components/bracket-outcome-nav";
import { BracketProgressPage } from "@/components/bracket-progress-page";
import { listMatchesForTournament } from "@/lib/data/matches";
import { listRoundsForTournament } from "@/lib/data/rounds";
import { getParallelTournamentAggregateResults } from "@/lib/data/parallel-tournaments";
import { getAccessibleTournamentById } from "@/lib/data/tournaments";
import { ParallelResultsPage } from "@/components/parallel-results-page";
import { ResultsLinkedViewSelect } from "@/components/results-linked-view-select";
import { TournamentScoringPage } from "@/components/tournament-scoring-page";
import { TournamentResultsPage } from "@/components/tournament-results-page";
import { listTournamentVoterScores } from "@/lib/data/matches";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { tournamentId } = await params;

  return {
    title: `Results | ${tournamentId} | Brackeroni`
  };
}

function normalizeStandardView(view, tournament) {
  const isParallelChildResult = Boolean(tournament.parentParallelTournamentId);
  const defaultView =
    tournament.status === "complete" || isParallelChildResult ? "results" : "rounds";

  if (view === "results" || view === "scoring") {
    return view;
  }

  if (view === "rounds" && !isParallelChildResult) {
    return view;
  }

  return defaultView;
}

export default async function TournamentResultsRoute({ params, searchParams }) {
  const { tournamentId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedView =
    typeof resolvedSearchParams.view === "string" ? resolvedSearchParams.view : null;
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;

  try {
    const tournament = await getAccessibleTournamentById({
      tournamentId,
      userId: user?.id ?? null,
      anonymousVoterToken
    });
    const selectedView = normalizeStandardView(requestedView, tournament);

    const isParallelChildResult = Boolean(tournament.parentParallelTournamentId);
    const canShowScoring = !tournament.parentParallelTournamentId;
    const viewNav = (
      <BracketOutcomeNav
        tournamentId={tournament.id}
        activeView={selectedView}
        showResults
        showRounds={!isParallelChildResult}
        showScoring={canShowScoring}
        disabledReasonByKey={
          tournament.status === "complete" || selectedView === "results"
            ? {}
            : {
                results:
                  "Bracket results are only available after the bracket closes. Use Rounds while voting is still in progress."
              }
        }
      />
    );
    if (selectedView === "scoring" && canShowScoring) {
      const voterScoreboard = await listTournamentVoterScores({
        tournament,
        userId: user?.id ?? null,
        anonymousVoterToken,
        includeVoteHistory: true
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

    const matchResult = await listMatchesForTournament({
      tournamentId,
      userId: user?.id ?? null,
      anonymousVoterToken
    });

    if (selectedView === "rounds") {
      const rounds = await listRoundsForTournament({
        tournamentId,
        userId: user?.id ?? null
      });
      const isCreator = Boolean(user?.id && tournament.creatorUserId === user.id);

      return (
        <BracketProgressPage
          tournament={tournament}
          rounds={rounds}
          matches={matchResult.matches ?? []}
          isCreator={isCreator}
          outcomeNav={viewNav}
        />
      );
    }

    return (
      <TournamentResultsPage
        tournament={tournament}
        matches={matchResult.matches ?? []}
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
                  href: `/results/${tournament.parentParallelTournamentId}`
                }
              ]}
            />
          ) : null
        }
        headerNotice={
          !isParallelChildResult && tournament.status === "active" ? (
            <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              You already voted in the currently available matchup for this bracket.
              <span className="ml-2">These are the live results while voting continues.</span>
            </div>
          ) : null
        }
      />
    );
  } catch (standardError) {
    try {
      const parallelResults = await getParallelTournamentAggregateResults({
        parallelTournamentId: tournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken
      });

      return (
        <ParallelResultsPage
          tournament={parallelResults.tournament}
          aggregateEntries={parallelResults.aggregateEntries}
          participants={parallelResults.participants}
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
