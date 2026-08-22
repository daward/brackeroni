"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openNextTournamentRound, revealTournamentRound } from "@/lib/client-api/create-workspace";

type RevealTournament = { id: string; visibility?: string | null };
type RevealRound = { id: string; status: string; revealedAt?: string | null };

type RoundRevealControlsProps = {
  tournament: RevealTournament;
  round: RevealRound;
  canReveal: boolean;
  isFinalRound: boolean;
  onReveal: (round: { id: string; revealedAt?: string | null }) => void;
};

export function RoundRevealControls({ tournament, round, canReveal, onReveal, isFinalRound }: RoundRevealControlsProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isRevealable = canReveal && round.status === "closed" && !round.revealedAt;
  const isPublicBracket = ["public_listed", "public_unlisted"].includes(tournament.visibility ?? "");
  const actionLabel = isFinalRound ? "Reveal Final Results" : "Open Next Round";

  function handleReveal() {
    startTransition(async () => {
      setMessage("");
      try {
        if (isPublicBracket) {
          await openNextTournamentRound(tournament.id);
          router.refresh();
          return;
        }
        const data = await revealTournamentRound(round.id);
        onReveal(data.item);
        setMessage("Round revealed.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : isPublicBracket ? "Failed to open the next round." : "Failed to reveal round.");
      }
    });
  }

  return <div className="flex flex-wrap items-center gap-3">
    {isRevealable ? <div>
      <button type="button" onClick={handleReveal} disabled={isPending} className="ui-button ui-button-primary">
        {isPending ? (isPublicBracket ? "Opening" : "Revealing") : isPublicBracket ? actionLabel : "Reveal Round"}
      </button>
      {isPublicBracket ? <p className="mt-2 max-w-md text-xs leading-5 text-[var(--muted)]">
        {isFinalRound ? "Makes the final result visible to everyone." : "Makes these results visible and opens voting for the next round."}
      </p> : null}
    </div> : null}
    {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
  </div>;
}
