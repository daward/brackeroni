"use client";

import {
  buildDirectBracketSharePath,
  isPublicBracketVisibility
} from "@/components/create-panel-helpers";
import {
  ensureParallelTournamentShareLink,
  ensureTournamentShareLink
} from "@/lib/client-api/create-workspace";

export function useTournamentSharingActions({
  tournaments,
  tournamentShareLinks,
  setTournamentShareLink,
  isActionPending,
  beginAction,
  endAction,
  setErrorMessage,
  setSuccessMessage
}) {
  async function handleEnsureShareLink(tournamentId, { rotate = false, silent = false } = {}) {
    const actionKey = rotate ? `rotate-link:${tournamentId}` : `share-link:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return null;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const isParallelParent = tournament?.kind === "parallel_parent";

    beginAction(actionKey);
    if (!silent) {
      setErrorMessage("");
      setSuccessMessage("");
    }

    try {
      const data = isParallelParent
        ? await ensureParallelTournamentShareLink(tournamentId, { rotate })
        : await ensureTournamentShareLink(tournamentId, { rotate });

      setTournamentShareLink(tournamentId, data.item);
      if (!silent) {
        setSuccessMessage(rotate ? "Share link refreshed." : "Share link ready.");
      }
      return data.item;
    } catch (error) {
      setErrorMessage(error.message || "Failed to prepare share link.");
      return null;
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCopyShareLink(tournamentId) {
    setErrorMessage("");
    setSuccessMessage("");

    const tournament = tournaments.find((entry) => entry.id === tournamentId);

    if (tournament && isPublicBracketVisibility(tournament.visibility)) {
      const shareUrl = `${window.location.origin}${buildDirectBracketSharePath(tournament)}`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setSuccessMessage("Bracket link copied.");
      } catch {
        setErrorMessage("Could not copy the bracket link.");
      }

      return;
    }

    let link = tournamentShareLinks[tournamentId]?.find((item) => item.active);
    if (!link) {
      link = await handleEnsureShareLink(tournamentId);
    }

    if (!link) {
      return;
    }

    const shareUrl = `${window.location.origin}/join/${link.token}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setSuccessMessage("Share link copied.");
    } catch {
      setErrorMessage("Could not copy the share link.");
    }
  }

  return {
    handleCopyShareLink,
    handleEnsureShareLink
  };
}
