"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function getHeadline(item) {
  if (item.accessState === "complete") {
    return `${item.creatorName} wrapped up ${item.title}.`;
  }

  if (item.accessState === "link_inactive") {
    return `This invite for ${item.title} is no longer active.`;
  }

  if (item.accessState === "not_invited") {
    return `You are not on the voting list for ${item.title}.`;
  }

  return `${item.creatorName} wants your votes on ${item.title}.`;
}

function getStatusLine(item) {
  switch (item.accessState) {
    case "waiting":
      return "Your bracket will start soon. Get ready to vote.";
    case "active":
      return "Your bracket is live now.";
    case "complete":
      return "The bracket is complete. You can jump straight to the results.";
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
  const [secondsUntilPoll, setSecondsUntilPoll] = useState(10);

  const pollEnabled = useMemo(
    () => item.accessState === "waiting" && pollCount < 18,
    [item.accessState, pollCount]
  );

  useEffect(() => {
    if (item.accessState === "active") {
      router.replace(item.votePath);
    }
  }, [item.accessState, item.votePath, router]);

  useEffect(() => {
    if (!pollEnabled) {
      return undefined;
    }

    setSecondsUntilPoll(10);

    const timer = setInterval(() => {
      setSecondsUntilPoll((current) => (current <= 1 ? 10 : current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [pollEnabled, pollCount]);

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
      
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="bg-[var(--panel)] px-6 py-10 text-center sm:px-8 sm:py-12">
          <h1 className="display-face mx-auto max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
            {getHeadline(item)}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
            {getStatusLine(item)}
          </p>
          {item.accessState === "waiting" ? (
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Checking again in {secondsUntilPoll} second{secondsUntilPoll === 1 ? "" : "s"}.
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {item.accessState === "active" ? (
              <Link
                href={item.votePath}
                className="display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:border-[var(--accent-3)] hover:bg-[var(--accent-3)]"
              >
                Open Bracket
              </Link>
            ) : null}
            {item.accessState === "complete" ? (
              <Link
                href={item.resultsPath}
                className="display-face border border-[var(--accent-2)] bg-[var(--accent-2)] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:border-[var(--accent-3)] hover:bg-[var(--accent-3)]"
              >
                View Results
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
