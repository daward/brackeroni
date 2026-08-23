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
  const pendingLabel = isPublicBracket ? "Opening" : "Revealing";
  const buttonLabel = getRevealButtonLabel({ isPending, isPublicBracket, actionLabel });
  const publicCopy = getPublicRevealCopy(isFinalRound);

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
        setMessage(getRevealErrorMessage(error, isPublicBracket));
      }
    });
  }

  return (
    <>
      {isRevealable ? (
        <div>
          <button type="button" onClick={handleReveal} disabled={isPending} className="ui-button ui-button-primary">
            {isPending ? pendingLabel : buttonLabel}
          </button>
          {isPublicBracket ? <p className="progress-round-reveal-copy">{publicCopy}</p> : null}
        </div>
      ) : null}
      {message ? <p className="progress-round-message">{message}</p> : null}
    </>
  );
}

function getRevealButtonLabel({ isPending, isPublicBracket, actionLabel }: { isPending: boolean; isPublicBracket: boolean; actionLabel: string }) {
  if (isPending) return "";
  if (isPublicBracket) return actionLabel;
  return "Reveal Round";
}

function getPublicRevealCopy(isFinalRound: boolean) {
  if (isFinalRound) return "Makes the final result visible to everyone.";
  return "Makes these results visible and opens voting for the next round.";
}

function getRevealErrorMessage(error: unknown, isPublicBracket: boolean) {
  if (error instanceof Error) return error.message;
  if (isPublicBracket) return "Failed to open the next round.";
  return "Failed to reveal round.";
}
