"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getShareLinkAccess } from "@/lib/client-api/share-links";
import type { ShareLinkAccessItem, ShareLinkWaitingRoomProps } from "../types";
import styles from "./share-link-waiting-room.module.css";

function getHeadline(item: ShareLinkAccessItem) {
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

function getStatusLine(item: ShareLinkAccessItem) {
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

export function ShareLinkWaitingRoom({ token, initialItem }: ShareLinkWaitingRoomProps) {
  const router = useRouter();
  const [item, setItem] = useState(initialItem);
  const [pollCount, setPollCount] = useState(0);
  const [secondsUntilPoll, setSecondsUntilPoll] = useState(10);

  const pollEnabled = useMemo(() => item.accessState === "waiting" && pollCount < 18, [item.accessState, pollCount]);

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
        const data = await getShareLinkAccess(token);
        if (data.item) {
          setItem(data.item as ShareLinkAccessItem);
        }
      } finally {
        setPollCount((current) => current + 1);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [pollEnabled, token, pollCount]);

  return (
    <div className={styles.shell}>
      <section className={styles.panel}>
        <div className={styles.body}>
          <h1 className={`display-face ${styles.headline}`}>{getHeadline(item)}</h1>
          <p className={styles.statusLine}>{getStatusLine(item)}</p>
          {item.accessState === "waiting" ? (
            <p className={styles.pollStatus}>
              Checking again in {secondsUntilPoll} second{secondsUntilPoll === 1 ? "" : "s"}.
            </p>
          ) : null}
          <div className={styles.actions}>
            {item.accessState === "active" ? (
              <Link href={item.votePath} className="ui-button ui-button-primary">
                Open Bracket
              </Link>
            ) : null}
            {item.accessState === "complete" ? (
              <Link href={item.resultsPath} className="ui-button ui-button-primary">
                View Results
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
