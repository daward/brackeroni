"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function getStatusLine(item) {
  switch (item.accessState) {
    case "waiting":
      return "You are on the list. This bracket has not started yet.";
    case "active":
      return "The bracket is live now.";
    case "complete":
      return "This bracket has already finished.";
    case "link_inactive":
      return "This invite link is no longer active.";
    case "not_invited":
      return "This bracket already started and your account was not on the locked invite list.";
    default:
      return "Waiting for the bracket state.";
  }
}

export function ShareLinkWaitingRoom({ token, initialItem }) {
  const router = useRouter();
  const [item, setItem] = useState(initialItem);
  const [pollCount, setPollCount] = useState(0);

  const pollEnabled = useMemo(
    () => item.accessState === "waiting" && pollCount < 18,
    [item.accessState, pollCount]
  );

  useEffect(() => {
    if (item.accessState === "active") {
      router.replace(`/vote?tournament=${item.tournamentId}`);
    }
  }, [item.accessState, item.tournamentId, router]);

  useEffect(() => {
    if (!pollEnabled) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/share-links/${token}`, {
          cache: "no-store"
        });
        const data = await response.json();

        if (response.ok && data.item) {
          setItem(data.item);
        }
      } finally {
        setPollCount((current) => current + 1);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [pollEnabled, token, pollCount]);

  return (
    <div className="space-y-6">
      <section className="grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="bg-[var(--panel)] px-5 py-4">
          <p className="display-face text-3xl font-black leading-none sm:text-4xl">
            {item.title}
          </p>
        </div>
        <div className="bg-[var(--panel-3)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Status</p>
          <p className="display-face mt-2 text-2xl font-black text-[var(--accent-3)]">
            {item.status}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border border-[var(--line)] bg-[var(--panel-2)] p-5">
          <p className="display-face text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">
            Invite
          </p>
          <p className="mt-4 text-lg leading-8 text-[var(--ink)]">{getStatusLine(item)}</p>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Created by {item.creatorName}. {item.entryCount} entries
            {item.sourcePoolName ? ` from ${item.sourcePoolName}.` : "."}
          </p>
          {item.accessState === "waiting" ? (
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              This page will check for updates for a few minutes. Once the bracket starts, you will
              be taken to voting automatically.
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {item.accessState === "active" ? (
              <Link
                href={`/vote?tournament=${item.tournamentId}`}
                className="display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:border-[var(--accent-3)] hover:bg-[var(--accent-3)]"
              >
                Open Bracket
              </Link>
            ) : null}
            {item.accessState === "complete" ? (
              <Link
                href={`/results/${item.tournamentId}`}
                className="display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:border-[var(--accent-3)] hover:bg-[var(--accent-3)]"
              >
                View Results
              </Link>
            ) : null}
            <Link
              href="/"
              className="display-face border border-[var(--line)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="display-face text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">
            Your Spot
          </p>
          <div className="mt-4 space-y-3">
            <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Invite State</p>
              <p className="display-face mt-2 text-xl font-black text-[var(--accent-2)]">
                {item.isCreator ? "Creator" : item.joined ? item.inviteStatus || "Pending" : "Unavailable"}
              </p>
            </div>
            <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Polling</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
                {pollEnabled ? "Checking every 10 seconds." : "Automatic checking paused."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
