"use client";

import { useState } from "react";
import { CloseVotingButton } from "./close-voting-button";
import { StatusActionRow } from "./status-action-row";
import { LiveAccordion } from "./live-accordion";
import { LiveSummaryCard } from "./live-summary-card";
import { ManualResultQueue } from "./status-manual-results";
import { StatusInlineVoting } from "./status-inline-voting";
import { DetailsPanel } from "./details-panel";
import { ParticipationTrackerPanel } from "./status-participation";
import { TournamentActionGroup } from "./tournament-action-group";
import styles from "./management.module.css";
import { getActiveStandardBracketStatus } from "./management-status";
import { calculateSwissRoundCount, nextPowerOfTwo } from "@/lib/brackets/engine/rounds";
import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/brackets/engine/result-modes";
import type { ActiveStandardTournamentSectionProps } from "../types";

export function ActiveStandardTournamentSection({
  tournament,
  activeRoundMatches,
  hasOpenVotes,
  activeRoundVoteGoal,
  creatorVotesCast,
  creatorIsDone,
  activeShareLink,
  invitees,
  participationUpdatedAt,
  canCopyBracketLink,
  describeTournamentAudienceMode,
  formatBracketRuleLabel,
  isActionPending,
  onCloseCurrentRound,
  onOpenNextRound,
  onVoteCurrentRound,
  onCopyShareLink,
  onRefreshParticipation,
  onSetManualMatchWinner,
  onRerunTournament,
  onArchiveTournament,
}: ActiveStandardTournamentSectionProps) {
  const [inlineVotingOpen, setInlineVotingOpen] = useState(false);
  const {
    activeVotedMatchCount,
    awaitingNextRound,
    canCloseManualVoting,
    completedManualResults,
    currentRoundMatches,
    isPrivateBracket,
    isPublicBracket,
    roundVoteTotal,
    unresolvedManualCount,
    usesManualAdvancement,
  } = getActiveStandardBracketStatus(tournament, activeRoundMatches);
  const currentRoundVoteGoal = currentRoundMatches.length || activeRoundVoteGoal;
  const currentCreatorVotesCast = awaitingNextRound
    ? currentRoundMatches.filter((match) => Boolean(match.userVoteEntryId)).length
    : creatorVotesCast;
  const currentCreatorIsDone = currentRoundVoteGoal > 0 && currentCreatorVotesCast >= currentRoundVoteGoal;
  const closeActionLabel = isFinalClosingRound(tournament) ? "Close Voting" : "Close Round";
  const standardSummaryRows = usesManualAdvancement
    ? [
        {
          title: "Winners Entered",
          meta: `${completedManualResults} of ${currentRoundVoteGoal} entered`,
        },
        {
          title: "Round Status",
          meta: unresolvedManualCount > 0 ? `${unresolvedManualCount} matchups still need winners` : "Every current matchup has a winner",
        },
      ]
    : [
        {
          title: "Votes Cast",
          meta: String(roundVoteTotal),
        },
        {
          title: "Matchup Activity",
          meta: currentRoundVoteGoal > 0
            ? `${activeVotedMatchCount} out of ${currentRoundVoteGoal} with votes`
            : "No open matchups",
        },
      ];
  const standardVoteIsActionable = hasOpenVotes;
  const standardVoteAction = hasOpenVotes
    ? {
        key: `vote:${tournament.id}`,
        label: "Vote",
        onClick: () => setInlineVotingOpen(true),
        className: "cta-link ui-button ui-button-primary",
      }
    : {
        key: `vote-closed:${tournament.id}`,
        label: "Vote",
        disabled: true,
        disabledReason: creatorIsDone ? "You already voted in the currently available matchup." : "There are no open matchups to vote on right now.",
        className: "ui-button ui-button-muted",
      };
  const standardResultsAction = {
    key: `results:${tournament.id}`,
    label: "Results",
    ...(tournament.status === "complete" || awaitingNextRound
      ? {
          href: `/results/${tournament.id}`,
          className: "ui-button ui-button-accent",
        }
      : {
          disabled: true,
          disabledReason: "Bracket results are only available after the bracket closes. Use Rounds while voting is still in progress.",
          className: "ui-button ui-button-muted",
        }),
  };
  const standardCloseAction = {
    key: `close-round:${tournament.id}`,
    render: () => (
      <CloseVotingButton
        label={closeActionLabel}
        className={getCloseVotingClassName({ standardVoteIsActionable })}
        disabled={usesManualAdvancement ? !canCloseManualVoting : isActionPending(`close-round:${tournament.id}`)}
        disabledReason={usesManualAdvancement && !canCloseManualVoting ? "Pick winners for every open matchup before closing this round." : ""}
        title={`${closeActionLabel}?`}
        body={getCloseVotingBody({ usesManualAdvancement, isPublicBracket, isFinalRound: closeActionLabel === "Close Voting" })}
        confirmLabel={closeActionLabel}
        onConfirm={() => onCloseCurrentRound(tournament.id)}
      />
    ),
  };
  const openNextRoundAction = {
    key: `open-next-round:${tournament.id}`,
    render: () => (
      <CloseVotingButton
        label="Open Next Round"
        className="ui-button ui-button-primary w-full"
        disabled={isActionPending(`open-next-round:${tournament.id}`)}
        title="Reveal results and open the next round?"
        body="This makes the closed round's results visible to voters and opens voting for the advancing winners."
        confirmLabel="Reveal & Open Next Round"
        onConfirm={() => onOpenNextRound(tournament.id)}
      />
    ),
  };
  const standardShareAction = canCopyBracketLink(tournament)
    ? {
        key: `share:${tournament.id}`,
        label: getShareActionLabel(tournament.sharingMode, Boolean(activeShareLink)),
        onClick: () => onCopyShareLink(tournament.id),
        disabled: tournament.sharingMode === "with_friends" && isActionPending(`share-link:${tournament.id}`),
        className: "ui-button ui-button-accent",
      }
    : {
        key: `share:${tournament.id}`,
        label: "Copy Link",
        disabled: true,
        disabledReason: tournament.visibility === "private" ? "Private brackets do not expose a share link." : "A share link is not available for this bracket yet.",
        className: "ui-button ui-button-muted",
      };
  const standardActions = awaitingNextRound
    ? [standardVoteAction, standardResultsAction, openNextRoundAction, standardShareAction]
    : [standardVoteAction, standardResultsAction, standardCloseAction, standardShareAction];

  return (
    <div className={styles.statusStack}>
      <LiveSummaryCard
        kicker={`${describeTournamentAudienceMode(tournament)} Bracket Status`}
        body={
          usesManualAdvancement
            ? `Round ${tournament.activeRoundNumber || 1}. Enter winners as games finish, then close the round when every real result is in.`
            : `Round ${tournament.activeRoundNumber || 1}. Track vote progress here, then close the round to advance the winners.`
        }
        actions={<StatusActionRow actions={standardActions} />}
      />

      {usesManualAdvancement ? (
        <LiveAccordion title="Results To Enter" defaultOpen={false}>
          <ManualResultQueue tournament={tournament} matches={currentRoundMatches} isActionPending={isActionPending} onSetManualMatchWinner={onSetManualMatchWinner} />
        </LiveAccordion>
      ) : null}

      {!usesManualAdvancement && inlineVotingOpen ? (
        <StatusInlineVoting
          tournament={tournament}
          matches={activeRoundMatches}
          isActionPending={isActionPending}
          onClose={() => setInlineVotingOpen(false)}
          onVote={onVoteCurrentRound}
        />
      ) : null}

      <LiveAccordion title="Bracket Actions" defaultOpen={false}>
        <TournamentActionGroup
          layout="row"
          align="start"
          actions={[
            {
              key: `rerun:${tournament.id}`,
              label: isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Rerun",
              onClick: () => onRerunTournament(tournament.id),
              disabled: isActionPending(`rerun-tournament:${tournament.id}`),
              className: "ui-button ui-button-accent",
            },
            {
              key: `archive:${tournament.id}`,
              label: isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive",
              onClick: () => onArchiveTournament(tournament.id, tournament.title),
              disabled: isActionPending(`archive-tournament:${tournament.id}`),
              className: "ui-button ui-button-muted",
            },
          ]}
        />
      </LiveAccordion>

      <ParticipationTrackerPanel
        tournament={tournament}
        invitees={invitees}
        creatorVotesCast={usesManualAdvancement ? undefined : currentCreatorVotesCast}
        activeRoundVoteGoal={usesManualAdvancement ? undefined : currentRoundVoteGoal}
        creatorIsDone={usesManualAdvancement ? undefined : currentCreatorIsDone}
        summaryRows={standardSummaryRows}
        updatedAt={participationUpdatedAt}
        isRefreshing={isActionPending(`refresh-participation:${tournament.id}`)}
        onRefresh={onRefreshParticipation ? () => onRefreshParticipation(tournament.id) : undefined}
      />

      <DetailsPanel
        items={[
          formatBracketRuleLabel(tournament.playStyle),
          formatBracketRuleLabel(tournament.resultMode),
          formatBracketRuleLabel(tournament.advancementMode || "vote_winner"),
          formatBracketRuleLabel(tournament.tieBreakMode),
          `${tournament.entryCount} entries`,
        ]}
      />
    </div>
  );
}

function getCloseVotingClassName({ standardVoteIsActionable }: { standardVoteIsActionable: boolean }) {
  if (standardVoteIsActionable) return "ui-button ui-button-accent w-full";
  return "ui-button ui-button-primary w-full";
}

function getCloseVotingBody({
  usesManualAdvancement,
  isPublicBracket,
  isFinalRound,
}: {
  usesManualAdvancement: boolean;
  isPublicBracket: boolean;
  isFinalRound: boolean;
}) {
  if (usesManualAdvancement) {
    return "This will close voting for the current bracket state and keep the winners you entered as the advancing entries.";
  }

  if (isPublicBracket) {
    if (isFinalRound) {
      return "This freezes the final vote totals. You can reveal the final results when you are ready.";
    }

    return "This freezes the vote totals. You will open the next round when you are ready to reveal these results.";
  }

  if (isFinalRound) {
    return "This will close voting and complete the bracket.";
  }

  return "This will close voting for the current round and open the next round with the advancing winners.";
}

function isFinalClosingRound(tournament: ActiveStandardTournamentSectionProps["tournament"]) {
  const activeRoundNumber = tournament.activeRoundNumber ?? 0;
  const entryCount = tournament.entryCount ?? 0;

  if (activeRoundNumber <= 0 || entryCount <= 1 || usesOpenEndedRankingMode(tournament.resultMode)) {
    return false;
  }

  if (usesSwissResultMode(tournament.resultMode)) {
    return activeRoundNumber >= calculateSwissRoundCount(entryCount);
  }

  return activeRoundNumber >= Math.ceil(Math.log2(nextPowerOfTwo(entryCount)));
}

function getShareActionLabel(sharingMode: string | null | undefined, hasShareLink: boolean) {
  if (sharingMode !== "with_friends") return "Copy Link";
  if (hasShareLink) return "Copy Link";
  return "Preparing";
}
