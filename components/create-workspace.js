"use client";

import { useEffect, useState, useTransition } from "react";
import { SectionCard } from "@/components/section-card";
import { STANDARD_RESULT_MODES, formatResultModeLabel } from "@/lib/bracket-modes";

const emptyCandidateForm = {
  name: "",
  description: "",
  imageUrl: ""
};

const emptyPoolForm = {
  name: "",
  description: ""
};

const emptyTournamentForm = {
  title: "",
  sourcePoolId: "",
  sharingMode: "private",
  visibility: "private",
  votingAccess: "signed_in_only",
  playStyle: "fixed_bracket",
  resultMode: "winner_only",
  tieBreakMode: "higher_seed_wins"
};

export function CreateWorkspace() {
  const [pools, setPools] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [poolDetails, setPoolDetails] = useState({});
  const [candidateDrafts, setCandidateDrafts] = useState({});
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [tournamentForm, setTournamentForm] = useState(emptyTournamentForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadWorkspace() {
    const [poolResponse, tournamentResponse] = await Promise.all([
      fetch("/api/pools", { cache: "no-store" }),
      fetch("/api/tournaments", { cache: "no-store" })
    ]);

    if (!poolResponse.ok || !tournamentResponse.ok) {
      throw new Error("Failed to load create workspace.");
    }

    const poolData = await poolResponse.json();
    const tournamentData = await tournamentResponse.json();

    setPools(poolData.items ?? []);
    setTournaments(tournamentData.items ?? []);

    const detailEntries = await Promise.all(
      (poolData.items ?? []).map(async (pool) => {
        const response = await fetch(`/api/pools/${pool.id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load pool ${pool.name}.`);
        }

        const data = await response.json();
        return [pool.id, data.item];
      })
    );

    setPoolDetails(Object.fromEntries(detailEntries));
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadWorkspace();
      } catch (error) {
        setErrorMessage(error.message);
      }
    });
  }, []);

  async function handleCreateCandidateInPool(poolId) {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = candidateDrafts[poolId] || emptyCandidateForm;

    const candidateResponse = await fetch(`/api/pools/${poolId}/candidates`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: draft.name,
        description: draft.description || null,
        imageUrl: draft.imageUrl || null
      })
    });

    const candidateData = await candidateResponse.json();
    if (!candidateResponse.ok) {
      setErrorMessage(candidateData.error?.message || "Failed to create candidate.");
      return;
    }

    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: emptyCandidateForm
    }));
    setSuccessMessage("Candidate created inside pool.");
    await loadWorkspace();
  }

  async function handlePoolSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch("/api/pools", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: poolForm.name,
        description: poolForm.description || null
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error?.message || "Failed to create pool.");
      return;
    }

    setPoolForm(emptyPoolForm);
    setSuccessMessage("Pool created.");
    await loadWorkspace();
  }

  async function handleTournamentSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch("/api/tournaments", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        ...tournamentForm,
        description: null
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error?.message || "Failed to create tournament.");
      return;
    }

    setTournamentForm(emptyTournamentForm);
    setSuccessMessage("Draft tournament created.");
    await loadWorkspace();
  }

  async function handleStartTournament(tournamentId) {
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "active"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error?.message || "Failed to start tournament.");
      return;
    }

    setSuccessMessage("Tournament started.");
    await loadWorkspace();
  }

  async function handleArchiveTournament(tournamentId, title) {
    const confirmed = window.confirm(
      `Archive "${title}"?\n\nThis will hide it from the main views, but keep its data and history.`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "DELETE"
    });

    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error?.message || "Failed to archive tournament.");
      return;
    }

    setSuccessMessage("Tournament archived.");
    await loadWorkspace();
  }

  async function handleCloseCurrentRound(tournamentId) {
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        closeCurrentRound: true
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error?.message || "Failed to close the current round.");
      return;
    }

    setSuccessMessage("Round closed and bracket advanced.");
    await loadWorkspace();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
      <SectionCard title="New Pool">
        <div className="space-y-5 px-5 pb-5">
          <form className="space-y-3 border-b border-[var(--line)] pb-5" onSubmit={handlePoolSubmit}>
            <input
              value={poolForm.name}
              onChange={(event) =>
                setPoolForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Pool name"
              className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
            />
            <textarea
              value={poolForm.description}
              onChange={(event) =>
                setPoolForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Pool description"
              rows={3}
              className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
            />
            <button
              type="submit"
              disabled={isPending}
              className="display-face border border-[var(--accent-3)] bg-[var(--accent-3)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[var(--accent-2)]"
            >
              Add Pool
            </button>
          </form>

          <FlashMessages errorMessage={errorMessage} successMessage={successMessage} />

        </div>
      </SectionCard>

      <SectionCard title="Pools">
        <div className="space-y-0 px-5 pb-5">
          {pools.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No pools yet.</p>
          ) : (
            pools.map((pool) => (
                <div
                  key={pool.id}
                  className="border-b border-[var(--line)] bg-[var(--panel-2)] p-5 last:border-b-0"
                >
                  <h3 className="display-face text-2xl font-black uppercase">{pool.name}</h3>
                  <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)]">
                    {pool.candidateCount} candidates
                  </p>
                  {pool.description ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{pool.description}</p>
                  ) : null}
                  <div className="mt-5">
                    <div className="space-y-3 border border-[var(--line)] bg-[var(--panel-3)] p-4">
                      <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                        Create Here
                      </p>
                      <input
                        value={(candidateDrafts[pool.id] || emptyCandidateForm).name}
                        onChange={(event) =>
                          setCandidateDrafts((current) => ({
                            ...current,
                            [pool.id]: {
                              ...(current[pool.id] || emptyCandidateForm),
                              name: event.target.value
                            }
                          }))
                        }
                        placeholder="Candidate name"
                        className="w-full border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
                      />
                      <textarea
                        value={(candidateDrafts[pool.id] || emptyCandidateForm).description}
                        onChange={(event) =>
                          setCandidateDrafts((current) => ({
                            ...current,
                            [pool.id]: {
                              ...(current[pool.id] || emptyCandidateForm),
                              description: event.target.value
                            }
                          }))
                        }
                        placeholder="Description"
                        rows={2}
                        className="w-full border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
                      />
                      <input
                        value={(candidateDrafts[pool.id] || emptyCandidateForm).imageUrl}
                        onChange={(event) =>
                          setCandidateDrafts((current) => ({
                            ...current,
                            [pool.id]: {
                              ...(current[pool.id] || emptyCandidateForm),
                              imageUrl: event.target.value
                            }
                          }))
                        }
                        placeholder="Image URL"
                        className="w-full border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateCandidateInPool(pool.id)}
                        className="display-face border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[var(--accent-2)]"
                      >
                        Create Candidate
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      In This Pool
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(poolDetails[pool.id]?.candidates || []).length === 0 ? (
                        <span className="text-sm text-[var(--muted)]">No candidates in this pool yet.</span>
                      ) : (
                        (poolDetails[pool.id]?.candidates || []).map((candidate) => (
                          <span
                            key={candidate.id}
                            className="border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--ink)]"
                          >
                            {candidate.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="New Tournament">
          <div className="space-y-5 px-5 pb-5">
            <form className="space-y-3" onSubmit={handleTournamentSubmit}>
              <input
                value={tournamentForm.title}
                onChange={(event) =>
                  setTournamentForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Tournament title"
                className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
              />
              <select
                value={tournamentForm.sourcePoolId}
                onChange={(event) =>
                  setTournamentForm((current) => ({ ...current, sourcePoolId: event.target.value }))
                }
                className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              >
                <option value="">Choose source pool</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={tournamentForm.sharingMode}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, sharingMode: event.target.value }))
                  }
                  className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="private">Private</option>
                  <option value="with_friends">Friends</option>
                </select>
                <select
                  value={tournamentForm.visibility}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, visibility: event.target.value }))
                  }
                  className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="private">Private Draft</option>
                  <option value="public_listed">Public</option>
                  <option value="public_unlisted">Public Unlisted</option>
                </select>
                <select
                  value={tournamentForm.votingAccess}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      votingAccess: event.target.value
                    }))
                  }
                  className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="signed_in_only">Signed-In Voting</option>
                  <option value="anyone">Anyone Can Vote</option>
                </select>
                <select
                  value={tournamentForm.playStyle}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, playStyle: event.target.value }))
                  }
                  className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="fixed_bracket">Fixed Bracket</option>
                  <option value="reseed">Reseed</option>
                </select>
                <select
                  value={tournamentForm.resultMode}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, resultMode: event.target.value }))
                  }
                  className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  {STANDARD_RESULT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {formatResultModeLabel(mode)}
                    </option>
                  ))}
                </select>
                <select
                  value={tournamentForm.tieBreakMode}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, tieBreakMode: event.target.value }))
                  }
                  className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="higher_seed_wins">Higher Seed Wins</option>
                  <option value="random">Random</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="display-face border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[var(--accent-2)]"
              >
                Create Tournament
              </button>
            </form>
          </div>
        </SectionCard>

        <SectionCard title="Tournaments">
          <div className="space-y-0 px-5 pb-5">
            {tournaments.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No tournaments yet.</p>
            ) : (
              tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="border-b border-[var(--line)] bg-[var(--panel-2)] p-5 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="display-face text-2xl font-black uppercase">{tournament.title}</h3>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Pool: {tournament.sourcePoolName || "Unknown pool"}
                      </p>
                    </div>
                    <span className="border border-[var(--accent)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--accent-2)]">
                      {tournament.status}
                    </span>
                  </div>
                  {tournament.status === "draft" ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartTournament(tournament.id)}
                        className="display-face border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[var(--accent-2)]"
                      >
                        Start Tournament
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveTournament(tournament.id, tournament.title)}
                        className="display-face border border-[var(--line)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
                      >
                        Archive
                      </button>
                    </div>
                  ) : tournament.status === "active" ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleCloseCurrentRound(tournament.id)}
                        className="display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:border-[var(--accent)] hover:bg-[var(--accent)]"
                      >
                        Close Current Round
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveTournament(tournament.id, tournament.title)}
                        className="display-face border border-[var(--line)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
                      >
                        Archive
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleArchiveTournament(tournament.id, tournament.title)}
                        className="display-face border border-[var(--line)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
                      >
                        Archive
                      </button>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
                    <span>{tournament.sharingMode.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{tournament.playStyle.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{tournament.resultMode.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{tournament.entryCount} entries</span>
                  </div>
                  {tournament.status === "complete" && tournament.winnerName ? (
                    <p className="mt-4 display-face text-lg font-black uppercase text-[var(--accent-2)]">
                      Winner: {tournament.winnerName}
                      {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function FlashMessages({ errorMessage, successMessage }) {
  if (!errorMessage && !successMessage) {
    return null;
  }

  return (
    <div className="space-y-2">
      {errorMessage ? (
        <p className="border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)]">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="border border-[var(--accent-3)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-3)]">
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}
