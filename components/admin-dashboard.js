"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionCard } from "@/components/section-card";
import {
  deleteArchivedAdminPool,
  deleteArchivedAdminTournament,
  purgeArchivedMaterial,
  updateAdminPool,
  updateAdminTournament
} from "@/lib/client-api/admin";

function formatDate(value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function labelForVisibility(visibility) {
  if (visibility === "public_listed") {
    return "Published";
  }

  if (visibility === "public_unlisted") {
    return "Published Unlisted";
  }

  return "Private";
}

function labelForAudience(tournament) {
  if (tournament.visibility === "public_listed") {
    return "Public";
  }

  if (tournament.visibility === "public_unlisted") {
    return "Public Unlisted";
  }

  if (tournament.sharingMode === "with_friends") {
    return "Friends";
  }

  return "Private";
}

function labelForEnum(value) {
  return String(value || "").replaceAll("_", " ");
}

export function AdminDashboard({ pools, tournaments }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const featuredPoolCount = pools.filter((pool) => pool.featuredOnHome && !pool.archivedAt).length;
  const archivedItemCount =
    pools.filter((pool) => pool.archivedAt).length +
    tournaments.filter((tournament) => tournament.archivedAt).length;

  async function runAction(actionKey, action) {
    if (pendingAction) {
      return;
    }

    setPendingAction(actionKey);
    setErrorMessage("");

    try {
      await action();
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message || "Admin action failed.");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <p className="border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)]">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
        <div className="bg-[var(--panel)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Published Pools</p>
          <p className="display-face mt-2 text-2xl font-black text-[var(--accent-3)]">
            {pools.filter((pool) => pool.visibility !== "private" && !pool.archivedAt).length}
          </p>
        </div>
        <div className="bg-[var(--panel)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Featured Pools</p>
          <p className="display-face mt-2 text-2xl font-black text-[var(--accent-2)]">
            {featuredPoolCount}
          </p>
        </div>
        <div className="bg-[var(--panel)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Stale Public Brackets</p>
          <p className="display-face mt-2 text-2xl font-black text-[var(--accent-2)]">
            {tournaments.filter((tournament) => tournament.isStalePublic).length}
          </p>
        </div>
        <div className="bg-[var(--panel)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Archived Items</p>
          <p className="display-face mt-2 text-2xl font-black text-[var(--accent)]">
            {archivedItemCount}
          </p>
        </div>
      </section>

      {archivedItemCount > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Delete all archived pools and brackets permanently?\n\nThis cannot be undone."
                )
              ) {
                runAction("purge-archived", purgeArchivedMaterial);
              }
            }}
            disabled={pendingAction === "purge-archived"}
            className="ui-button ui-button-muted"
          >
            {pendingAction === "purge-archived"
              ? "Deleting Archived Material"
              : "Delete All Archived Material"}
          </button>
        </div>
      ) : null}

      <SectionCard title="Pools">
        <div className="space-y-0">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="border-b border-[var(--line)] bg-[var(--panel-2)] px-5 py-4 last:border-b-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="display-face text-2xl font-black">{pool.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {labelForVisibility(pool.visibility)} / {pool.candidateCount} candidates /{" "}
                    {pool.creatorEmail}
                  </p>
                  {pool.featuredOnHome ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--accent-2)]">
                      Featured
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {pool.description || "No description."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pool.visibility === "public_listed" && !pool.archivedAt ? (
                    <label className="group inline-flex min-h-[46px] items-center gap-3 border border-[var(--line)] bg-[var(--panel)] px-4 py-3 transition hover:border-[var(--accent-2)]">
                      <input
                        type="checkbox"
                        checked={Boolean(pool.featuredOnHome)}
                        disabled={pendingAction === `pool-featured:${pool.id}`}
                        onChange={(event) =>
                          runAction(`pool-featured:${pool.id}`, () =>
                            updateAdminPool(pool.id, { featuredOnHome: event.target.checked })
                          )
                        }
                        className="peer sr-only"
                      />
                      <span className="flex h-5 w-5 items-center justify-center border border-[var(--line)] bg-[var(--panel-3)] text-transparent transition peer-checked:border-[var(--accent-2)] peer-checked:bg-[var(--accent-2)] peer-checked:text-black peer-disabled:opacity-50">
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.2]">
                          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                        </svg>
                      </span>
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--accent-2)] transition group-hover:text-[var(--ink)]">
                        Featured
                      </span>
                    </label>
                  ) : null}
                  {pool.visibility !== "private" && !pool.archivedAt ? (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(`pool-private:${pool.id}`, () =>
                          updateAdminPool(pool.id, { visibility: "private" })
                        )
                      }
                      disabled={pendingAction === `pool-private:${pool.id}`}
                      className="ui-button ui-button-accent"
                    >
                      {pendingAction === `pool-private:${pool.id}` ? "Saving" : "Unpublish"}
                    </button>
                  ) : null}
                  {pool.archivedAt ? (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(`pool-delete:${pool.id}`, () => deleteArchivedAdminPool(pool.id))
                      }
                      disabled={pendingAction === `pool-delete:${pool.id}`}
                      className="ui-button ui-button-muted"
                    >
                      {pendingAction === `pool-delete:${pool.id}` ? "Deleting" : "Delete Archived"}
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--accent-3)]">
                Updated {formatDate(pool.updatedAt) || "Unknown"}
                {pool.publishedAt ? ` / Published ${formatDate(pool.publishedAt)}` : ""}
                {pool.archivedAt ? ` / Archived ${formatDate(pool.archivedAt)}` : ""}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Brackets">
        <div className="space-y-0">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="border-b border-[var(--line)] bg-[var(--panel-2)] px-5 py-4 last:border-b-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="display-face text-2xl font-black">{tournament.title}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {labelForAudience(tournament)} / {tournament.status} /{" "}
                    {tournament.entryCount} entries / {tournament.creatorEmail}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--accent-3)]">
                    {labelForAudience(tournament)} / {labelForEnum(tournament.playStyle)} /{" "}
                    {labelForEnum(tournament.resultMode)} / {labelForEnum(tournament.tieBreakMode)} /{" "}
                    {labelForEnum(tournament.votingAccess)} / {labelForEnum(tournament.roundClosureMode)}
                  </p>
                  {tournament.isStalePublic ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--accent-2)]">
                      No vote in over 7 days
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tournament.visibility !== "private" && !tournament.archivedAt ? (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          `tournament-private:${tournament.id}`,
                          () => updateAdminTournament(tournament.id, { visibility: "private" })
                        )
                      }
                      disabled={pendingAction === `tournament-private:${tournament.id}`}
                      className="ui-button ui-button-accent"
                    >
                      {pendingAction === `tournament-private:${tournament.id}` ? "Saving" : "Unlist"}
                    </button>
                  ) : null}
                  {tournament.archivedAt ? (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(
                          `tournament-delete:${tournament.id}`,
                          () => deleteArchivedAdminTournament(tournament.id)
                        )
                      }
                      disabled={pendingAction === `tournament-delete:${tournament.id}`}
                      className="ui-button ui-button-muted"
                    >
                      {pendingAction === `tournament-delete:${tournament.id}`
                        ? "Deleting"
                        : "Delete Archived"}
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--accent-3)]">
                Last vote {formatDate(tournament.lastVoteAt) || "Never"}
                {tournament.archivedAt ? ` / Archived ${formatDate(tournament.archivedAt)}` : ""}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
