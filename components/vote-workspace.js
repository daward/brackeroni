"use client";

import { useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { formatResultModeLabel } from "@/lib/bracket-modes";
import { getTournamentWithMatches, submitMatchVote } from "@/lib/client-api/voting";

export function VoteWorkspace({ activeTournaments, completedTournaments }) {
  const [active, setActive] = useState(activeTournaments);
  const [completed, setCompleted] = useState(completedTournaments);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function vote(matchId, tournamentId, selectedEntryId) {
    setError("");
    setMessage("");

    try {
      await submitMatchVote(matchId, selectedEntryId);
    } catch (error) {
      if (error.status === 400 && error.code === "MATCH_NOT_OPEN") {
        setMessage("That round already closed. Refreshing bracket state.");

        const { matches, tournament: refreshedTournament } = await getTournamentWithMatches(tournamentId);

        if (refreshedTournament.status === "complete") {
          setActive((current) => current.filter((tournament) => tournament.id !== tournamentId));
          setCompleted((current) => [refreshedTournament, ...current]);
          return;
        }

        setActive((current) =>
          current.map((tournament) =>
            tournament.id === tournamentId
              ? {
                  ...tournament,
                  ...refreshedTournament,
                  matches
                }
              : tournament
          )
        );
        return;
      }

      setError(error.message || "Failed to record vote.");
      return;
    }

    setMessage("Vote recorded.");
    const { matches, tournament: refreshedTournament } = await getTournamentWithMatches(tournamentId);

    if (refreshedTournament.status === "complete") {
      setActive((current) => current.filter((tournament) => tournament.id !== tournamentId));
      setCompleted((current) => [refreshedTournament, ...current]);
      setMessage("Vote recorded. Tournament complete.");
      return;
    }

    setActive((current) =>
      current.map((tournament) =>
        tournament.id === tournamentId
          ? {
              ...tournament,
              ...refreshedTournament,
              matches
            }
          : tournament
      )
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        {error ? (
          <p className="border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="border border-[var(--accent-3)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-3)]">
            {message}
          </p>
        ) : null}
      </div>
      <div />
      <div className="lg:col-span-1">
        <div className="space-y-0">
          {active.length === 0 ? (
            <div className="bg-[var(--panel-2)] p-5">
              <p className="text-sm leading-6 text-[var(--muted)]">
                No started tournaments are awaiting votes yet.
              </p>
            </div>
          ) : (
            active.map((tournament) => (
              <div
                key={tournament.id}
                className="border-b border-[var(--line)] bg-[var(--panel-2)] p-5 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="display-face text-2xl font-black uppercase">{tournament.title}</h3>
                    <p className="mt-1 text-sm uppercase tracking-[0.15em] text-[var(--muted)]">
                      {tournament.sharingMode.replace("_", " ")} • {tournament.entryCount} entries
                    </p>
                  </div>
                  <StatusPill>{tournament.status}</StatusPill>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  Pool: {tournament.sourcePoolName || "Unknown pool"}.
                </p>

                {(tournament.matches || []).length > 0 ? (
                  <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-5">
                    {tournament.matches.filter((match) => match.status === "open").length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">
                        No open matches are available in the current round.
                      </p>
                    ) : (
                      tournament.matches
                        .filter((match) => match.status === "open")
                        .map((match) => (
                        <div key={match.id} className="border border-[var(--line)] bg-[var(--panel-3)] p-4">
                          <p className="text-xs uppercase tracking-[0.15em] text-[var(--accent-3)]">
                            Round {match.roundNumber}
                          </p>
                          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                            <button
                              type="button"
                              onClick={() => vote(match.id, tournament.id, match.leftEntryId)}
                              disabled={Boolean(match.userVoteEntryId)}
                              className="border border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-left transition hover:border-[var(--accent)] disabled:opacity-60"
                            >
                              <p className="display-face text-xl font-black uppercase">{match.leftName}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                                Seed {match.leftSeed}
                              </p>
                              {match.userVoteEntryId === match.leftEntryId ? (
                                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--accent-3)]">
                                  Your vote
                                </p>
                              ) : null}
                            </button>
                            <p className="display-face text-center text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                              vs
                            </p>
                            <button
                              type="button"
                              onClick={() => vote(match.id, tournament.id, match.rightEntryId)}
                              disabled={Boolean(match.userVoteEntryId)}
                              className="border border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-left transition hover:border-[var(--accent)] disabled:opacity-60"
                            >
                              <p className="display-face text-xl font-black uppercase">{match.rightName}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                                Seed {match.rightSeed}
                              </p>
                              {match.userVoteEntryId === match.rightEntryId ? (
                                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--accent-3)]">
                                  Your vote
                                </p>
                              ) : null}
                            </button>
                          </div>
                        </div>
                        ))
                    )}
                  </div>
                ) : (
                  <div className="mt-5 border-t border-[var(--line)] pt-5">
                    <p className="text-sm text-[var(--muted)]">
                      No matches are available for this tournament right now.
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-4">
          {completed.length === 0 ? (
            <div className="px-5 pb-4">
              <p className="text-sm text-[var(--muted)]">No completed tournaments yet.</p>
            </div>
          ) : (
            completed.map((tournament) => (
              <div
                key={tournament.id}
                className="border-b border-[var(--line)] px-5 pb-4 last:border-b-0 last:pb-0"
              >
                <h3 className="display-face text-lg font-black uppercase">{tournament.title}</h3>
                <p className="mt-2 display-face text-sm font-bold uppercase tracking-[0.16em] text-[var(--accent-2)]">
                  {formatResultModeLabel(tournament.resultMode)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Completed tournament from {tournament.sourcePoolName || "an unknown pool"}.
                </p>
                {tournament.winnerName ? (
                  <p className="mt-3 display-face text-xl font-black uppercase text-[var(--accent-3)]">
                    Winner: {tournament.winnerName}
                    {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
