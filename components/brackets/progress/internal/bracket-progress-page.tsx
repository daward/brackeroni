"use client";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BracketOutcomeHeader } from "@/components/results/shared/bracket-outcome-header";
import { ShareCardModal } from "./share-card-modal";
import { formatResultModeLabel } from "@/lib/bracket-modes";
import { formatRoundTitle } from "@/lib/brackets/progress";
import { RoundProgressCard, type ShareCardPayload } from "./round-progress-card";
import type { BracketProgressPageProps, BracketProgressRound } from "../types";

export function BracketProgressPage({
  tournament,
  rounds,
  matches,
  isCreator,
  outcomeNav = null,
  headerAction = null
}: BracketProgressPageProps) {
  const [localRounds, setLocalRounds] = useState(rounds);
  const [shareCard, setShareCard] = useState<ShareCardPayload | null>(null);
  const [activeRoundId, setActiveRoundId] = useState(() =>
    [...rounds].sort((left, right) => right.roundNumber - left.roundNumber)[0]?.id ?? null
  );
  const roundRailItemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const roundRailAnchorRef = useRef<HTMLDivElement | null>(null);
  const isRoundNavigationRef = useRef(false);
  const [isRoundRailPinned, setIsRoundRailPinned] = useState(false);
  const orderedRounds = useMemo(
    () => [...localRounds].sort((left, right) => right.roundNumber - left.roundNumber),
    [localRounds]
  );
  const finalRoundNumber = useMemo(
    () => Math.max(...localRounds.map((round) => round.roundNumber), 0),
    [localRounds]
  );
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
      const latestPassedRound = [...roundPositions]
        .reverse()
        .find(({ element }) => element.getBoundingClientRect().top <= railClearance);

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
      inline: "center"
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
              revealedAt: revealedRound.revealedAt
            }
          : round
      )
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
            <div className="hidden border-t border-[var(--line)] pt-4 lg:block lg:border-y lg:py-4">
              <p className="results-section-title">Rounds</p>
            </div>
            <div ref={roundRailAnchorRef} className="h-20 lg:h-auto">
              <div
                className={`${isRoundRailPinned ? "fixed inset-x-0 top-0 z-40" : "relative -mx-4"} isolate py-2 lg:static lg:mx-0 lg:mt-3 lg:py-0`}
                style={
                  isRoundRailPinned
                    ? {
                        background:
                          "linear-gradient(180deg, rgba(255, 90, 54, 0.07), transparent 18rem), linear-gradient(90deg, rgba(52, 211, 196, 0.07), transparent 24rem), linear-gradient(180deg, var(--page-bg-2) 0%, var(--page-bg) 100%)",
                        backgroundAttachment: "fixed"
                      }
                    : undefined
                }
            >
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
                    className={`progress-round-rail-link ${
                      activeRoundId === round.id
                        ? "border-[var(--accent-3)] bg-[rgba(52,211,196,0.08)] text-[var(--ink)]"
                        : "border-[var(--line)] hover:border-[var(--accent-2)] hover:text-[var(--accent-2)]"
                    }`}
                  >
                    <span className="progress-round-rail-title">
                      {tournament.status === "complete" && round.roundNumber === finalRoundNumber
                        ? "Final Results"
                        : formatRoundTitle(round, tournament)}
                    </span>
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
            <p className="text-sm text-[var(--muted)]">No round progress is available yet.</p>
          ) : (
            orderedRounds.map((round) => (
              <RoundProgressCard
                key={round.id}
                tournament={tournament}
                round={round}
                matches={matchesByRoundId.get(round.id) || []}
                allMatches={matches}
                statMatches={
                  tournament.status === "complete" && round.roundNumber === finalRoundNumber
                    ? matches
                    : matchesByRoundId.get(round.id) || []
                }
                isFinalResults={
                  tournament.status === "complete" && round.roundNumber === finalRoundNumber
                }
                isSuperseded={round.roundNumber < finalRoundNumber}
                isCreator={isCreator}
                onOpenShareCard={setShareCard}
                onReveal={handleReveal}
              />
            ))
          )}
          </div>
        </div>
      </section>
      <ShareCardModal shareCard={shareCard} onClose={() => setShareCard(null)} />
    </div>
  );
}
