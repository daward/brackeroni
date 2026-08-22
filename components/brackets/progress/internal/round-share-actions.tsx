"use client";

import { useState } from "react";
import { type RoundStats } from "@/lib/brackets/progress";
import type { ShareCardPayload } from "./round-progress-card";
import { buildCreatorPrompt } from "./share-card-utils";

type ShareTournament = ShareCardPayload["tournament"];
type ShareRound = ShareCardPayload["round"];
type RoundMoreActionsProps = { tournament: ShareTournament; round: ShareRound; stats: RoundStats; onOpenShareCard: (payload: ShareCardPayload) => void; isFinalResults: boolean };


export function RoundMoreActions({ tournament, round, stats, onOpenShareCard, isFinalResults }: RoundMoreActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(buildCreatorPrompt({ tournament, round, stats }));
    setMessage("Creator prompt copied.");
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="ui-button ui-button-muted inline-flex h-12 items-center gap-2 px-4 text-sm"
        aria-label="More round actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true" className="flex flex-col gap-1">
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
        </span>
        <span>More</span>
      </button>
      {isOpen ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-56 border border-[var(--line-strong)] bg-[var(--panel)] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.3)]">
          <button type="button" onClick={handleCopyPrompt} className="block w-full px-3 py-3 text-left text-sm text-[var(--muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--ink)]">
            Copy creator prompt
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenShareCard({ tournament, round, stats, isFinalResults });
              setIsOpen(false);
            }}
            className="block w-full px-3 py-3 text-left text-sm text-[var(--accent-3)] hover:bg-[rgba(255,255,255,0.04)]"
          >
            Share card
          </button>
        </div>
      ) : null}
      {message ? <p className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-48 border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
