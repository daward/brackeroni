"use client";

import { useState } from "react";
import { type RoundStats } from "@/lib/brackets/progress";
import type { ShareCardPayload } from "./round-progress-card";
import { buildCreatorPrompt } from "./share-card-utils";

type ShareTournament = ShareCardPayload["tournament"];
type ShareRound = ShareCardPayload["round"];
type RoundMoreActionsProps = {
  tournament: ShareTournament;
  round: ShareRound;
  stats: RoundStats;
  onOpenShareCard: (payload: ShareCardPayload) => void;
  isFinalResults: boolean;
};

export function RoundMoreActions({ tournament, round, stats, onOpenShareCard, isFinalResults }: RoundMoreActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(buildCreatorPrompt({ tournament, round, stats }));
    setMessage("Creator prompt copied.");
    setIsOpen(false);
  }

  return (
    <div className="progress-round-share">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="ui-button ui-button-muted progress-round-share-button"
        aria-label="More round actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true" className="progress-round-share-icon">
          <span className="progress-round-share-dot" />
          <span className="progress-round-share-dot" />
          <span className="progress-round-share-dot" />
        </span>
        <span>More</span>
      </button>
      {isOpen ? (
        <div role="menu" className="progress-round-share-menu">
          <button type="button" onClick={handleCopyPrompt} className="progress-round-share-action">
            Copy creator prompt
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenShareCard({ tournament, round, stats, isFinalResults });
              setIsOpen(false);
            }}
            className="progress-round-share-action progress-round-share-action-accent"
          >
            Share card
          </button>
        </div>
      ) : null}
      {message ? <p className="progress-round-share-message">{message}</p> : null}
    </div>
  );
}
