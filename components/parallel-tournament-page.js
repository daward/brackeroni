"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ParallelTournamentPage({ parallelTournament }) {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState("");

  async function handleOpenBracket() {
    if (isOpening) {
      return;
    }

    setIsOpening(true);
    setError("");

    try {
      const response = await fetch(
        `/api/parallel-tournaments/${parallelTournament.id}/participants/me`,
        {
          method: "POST"
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Failed to open your bracket.");
        return;
      }

      router.push(`/vote?tournament=${data.item.tournamentId}`);
    } catch (nextError) {
      setError(nextError.message || "Failed to open your bracket.");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="vote-page">
      {error ? <p className="vote-message vote-message-error">{error}</p> : null}

      <section className="results-shell">
        <header className="results-header">
          <div className="results-header-row">
            <div className="results-header-copy">
              <p className="results-kicker">Parallel Bracket</p>
              <h1 className="results-title">{parallelTournament.title}</h1>
              <p className="results-meta">
                {parallelTournament.candidateCount} entries | {parallelTournament.participantCount} participants
              </p>
            </div>
          </div>
        </header>

        <div className="vote-callout-body">
          <p className="vote-callout-copy">
            Every participant gets a personal full-ranking bracket from the same pool. Final results
            are aggregated across completed brackets.
          </p>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            <span>Pool: {parallelTournament.sourcePoolName}</span>
            <span>/</span>
            <span>{parallelTournament.completedParticipantCount} complete</span>
            <span>/</span>
            <span>{parallelTournament.visibility.replaceAll("_", " ")}</span>
          </div>
          <div className="vote-callout-actions">
            <button
              type="button"
              onClick={handleOpenBracket}
              disabled={isOpening}
              className="ui-button ui-button-primary"
            >
              {isOpening ? "Opening" : "Open My Bracket"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
