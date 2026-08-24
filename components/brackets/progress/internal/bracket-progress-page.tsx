"use client";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BracketOutcomeHeader } from "@/components/brackets/results";
import { ShareCardModal } from "./share-card-modal";
import { formatResultModeLabel } from "@/lib/bracket-modes";
import { formatRoundTitle } from "@/lib/brackets/progress";
import { RoundProgressCard, type ShareCardPayload } from "./round-progress-card";
import type { BracketProgressPageProps, BracketProgressRound } from "../types";

export function BracketProgressPage({ tournament, rounds, matches, isCreator, outcomeNav = null, headerAction = null }: BracketProgressPageProps) {
  const [localRounds, setLocalRounds] = useState(rounds);
  const [shareCard, setShareCard] = useState<ShareCardPayload | null>(null);
  const [activeRoundId, setActiveRoundId] = useState(() => [...rounds].sort((left, right) => right.roundNumber - left.roundNumber)[0]?.id ?? null);
  const roundRailItemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const roundRailAnchorRef = useRef<HTMLDivElement | null>(null);
  const isRoundNavigationRef = useRef(false);
  const [isRoundRailPinned, setIsRoundRailPinned] = useState(false);
  const orderedRounds = useMemo(() => [...localRounds].sort((left, right) => right.roundNumber - left.roundNumber), [localRounds]);
  const finalRoundNumber = useMemo(() => Math.max(...localRounds.map((round) => round.roundNumber), 0), [localRounds]);
  const matchesByRoundId = useMemo(() => {
    const grouped = new Map();

    for (const match of matches) {
      const current = grouped.get(match.roundId) || [];
      current.push(match);
      grouped.set(match.roundId, current);
    }

    return grouped;
  }, [matches]);

  useEffect(() => {
    const updateRailMode = () => {
      const anchor = roundRailAnchorRef.current;
      setIsRoundRailPinned(Boolean(anchor && window.innerWidth < 1024 && anchor.getBoundingClientRect().top <= 0));
    };

    updateRailMode();
    window.addEventListener("scroll", updateRailMode, { passive: true });
    window.addEventListener("resize", updateRailMode);
    return () => {
      window.removeEventListener("scroll", updateRailMode);
      window.removeEventListener("resize", updateRailMode);
    };
  }, []);

  useEffect(() => {
    if (!orderedRounds.length) return undefined;

    const railClearance = 112;
    let animationFrame: number | null = null;
    const updateActiveRound = () => {
      animationFrame = null;
      if (isRoundNavigationRef.current) return;
      const roundPositions = orderedRounds
        .map((round) => ({ round, element: document.getElementById(`round-${round.id}`) }))
        .filter((position): position is { round: BracketProgressRound; element: HTMLElement } => Boolean(position.element));
      const containingRound = roundPositions.find(({ element }) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top <= railClearance && bounds.bottom > railClearance;
      });
      const latestPassedRound = [...roundPositions].reverse().find(({ element }) => element.getBoundingClientRect().top <= railClearance);

      setActiveRoundId((current) => containingRound?.round.id ?? latestPassedRound?.round.id ?? current ?? orderedRounds[0].id);
    };
    const requestUpdate = () => {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(updateActiveRound);
    };

    const unlockRoundTracking = () => {
      if (!isRoundNavigationRef.current) return;
      isRoundNavigationRef.current = false;
      requestUpdate();
    };

    updateActiveRound();
    document.addEventListener("scroll", requestUpdate, { capture: true, passive: true });
    document.addEventListener("touchstart", unlockRoundTracking, { capture: true, passive: true });
    window.addEventListener("wheel", unlockRoundTracking, { passive: true });
    window.addEventListener("keydown", unlockRoundTracking);
    window.addEventListener("resize", requestUpdate);
    return () => {
      document.removeEventListener("scroll", requestUpdate, true);
      document.removeEventListener("touchstart", unlockRoundTracking, true);
      window.removeEventListener("wheel", unlockRoundTracking);
      window.removeEventListener("keydown", unlockRoundTracking);
      window.removeEventListener("resize", requestUpdate);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [orderedRounds]);

  useEffect(() => {
    roundRailItemRefs.current.get(activeRoundId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeRoundId]);

  function handleRoundNavigation(event: MouseEvent<HTMLAnchorElement>, roundId: string) {
    event.preventDefault();
    isRoundNavigationRef.current = true;
    setActiveRoundId(roundId);
    document.getElementById(`round-${roundId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function handleReveal(revealedRound: { id: string; revealedAt?: string | null }) {
    setLocalRounds((current) =>
      current.map((round) =>
        round.id === revealedRound.id
          ? {
              ...round,
              revealedAt: revealedRound.revealedAt,
            }
          : round,
      ),
    );
  }

  return (
    <div className="results-page">
      <section className="results-shell">
        <BracketOutcomeHeader
          title={tournament.title}
          meta={`${formatResultModeLabel(tournament.resultMode)} | Creator sees all rounds. Participants only see revealed rounds.`}
          outcomeNav={outcomeNav as never}
          headerAction={headerAction as never}
        />

        <div className="progress-round-layout">
          <aside className="contents lg:sticky lg:top-4 lg:block">
            <div className="progress-round-sidebar-heading">
              <p className="results-section-title">Rounds</p>
            </div>
            <div ref={roundRailAnchorRef} className="progress-round-rail-anchor">
              <div className={getRoundRailShellClassName(isRoundRailPinned)}>
                <nav className="progress-round-rail rounds-navigation-rail">
                  {orderedRounds.map((round) => (
                    <a
                      key={round.id}
                      ref={(element) => {
                        if (element) roundRailItemRefs.current.set(round.id, element);
                        else roundRailItemRefs.current.delete(round.id);
                      }}
                      href={`#round-${round.id}`}
                      onClick={(event) => handleRoundNavigation(event, round.id)}
                      aria-current={activeRoundId === round.id ? "true" : undefined}
                      className="progress-round-rail-link"
                    >
                      <span className="progress-round-rail-title">{getRoundRailLabel(tournament, round, finalRoundNumber)}</span>
                      <span className="progress-round-rail-status">
                        {round.status}
                        {round.revealedAt ? " / revealed" : ""}
                      </span>
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            {orderedRounds.length === 0 ? (
              <p className="progress-round-empty">No round progress is available yet.</p>
            ) : (
              orderedRounds.map((round) => {
                const roundMatches = matchesByRoundId.get(round.id) || [];
                const isFinalResults = isFinalResultsRound(tournament, round, finalRoundNumber);
                return (
                  <RoundProgressCard
                    key={round.id}
                    tournament={tournament}
                    round={round}
                    matches={roundMatches}
                    allMatches={matches}
                    statMatches={isFinalResults ? matches : roundMatches}
                    isFinalResults={isFinalResults}
                    isSuperseded={round.roundNumber < finalRoundNumber}
                    isCreator={isCreator}
                    onOpenShareCard={setShareCard}
                    onReveal={handleReveal}
                  />
                );
              })
            )}
          </div>
        </div>
      </section>
      <ShareCardModal shareCard={shareCard} onClose={() => setShareCard(null)} />
    </div>
  );
}

function getRoundRailShellClassName(isPinned: boolean) {
  const pinnedClass = isPinned ? "progress-round-rail-shell-pinned" : "";
  return `progress-round-rail-shell ${pinnedClass}`.trim();
}

function isFinalResultsRound(tournament: BracketProgressPageProps["tournament"], round: BracketProgressRound, finalRoundNumber: number) {
  return tournament.status === "complete" && round.roundNumber === finalRoundNumber;
}

function getRoundRailLabel(tournament: BracketProgressPageProps["tournament"], round: BracketProgressRound, finalRoundNumber: number) {
  if (isFinalResultsRound(tournament, round, finalRoundNumber)) return "Final Results";
  return formatRoundTitle(round, tournament);
}
