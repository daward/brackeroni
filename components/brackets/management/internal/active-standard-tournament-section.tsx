"use client";

import { CloseVotingButton } from "./close-voting-button";
import { StatusActionRow } from "./status-action-row";
import { LiveAccordion } from "./live-accordion";
import { LiveSummaryCard } from "./live-summary-card";
import { ManualResultQueue } from "./status-manual-results";
import { DetailsPanel } from "./details-panel";
import { ParticipationTrackerPanel } from "./status-participation";
import { TournamentActionGroup } from "./tournament-action-group";
import styles from "./management.module.css";
import { getActiveStandardBracketStatus } from "./management-status";
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
  canCopyBracketLink,
  describeTournamentAudienceMode,
  formatBracketRuleLabel,
  isActionPending,
  onCloseCurrentRound,
  onOpenNextRound,
  onCopyShareLink,
  onSetManualMatchWinner,
  onRerunTournament,
  onArchiveTournament,
}: ActiveStandardTournamentSectionProps) {
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
  const standardSummaryRows = usesManualAdvancement
    ? [
        {
          title: "Winners Entered",
          meta: `${completedManualResults} of ${activeRoundVoteGoal} entered`,
        },
        {
          title: "Round Status",
          meta: unresolvedManualCount > 0 ? `${unresolvedManualCount} matchups still need winners` : "Every current matchup has a winner",
        },
      ]
    : [
        {
          title: "Round Votes",
          meta: roundVoteTotal > 0 ? `${roundVoteTotal} votes cast so far` : "No votes cast yet this round",
        },
        {
          title: "Matchup Activity",
          meta: activeRoundVoteGoal > 0 ? `${activeVotedMatchCount} of ${activeRoundVoteGoal} matchups have votes` : "No open matchups in this round",
        },
      ];
  const standardVoteIsActionable = hasOpenVotes;
  const standardVoteAction = hasOpenVotes
    ? {
        key: `vote:${tournament.id}`,
        href: `/vote?bracket=${tournament.id}&returnTo=create`,
        label: "Vote",
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
    ...(tournament.status === "complete"
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
        label="Close Voting"
        className={getCloseVotingClassName({ isPrivateBracket, standardVoteIsActionable })}
        disabled={isPrivateBracket || (usesManualAdvancement ? !canCloseManualVoting : isActionPending(`close-round:${tournament.id}`))}
        disabledReason={usesManualAdvancement && !canCloseManualVoting ? "Pick winners for every open matchup before closing voting." : ""}
        title="Close voting for this round?"
        body={getCloseVotingBody({ usesManualAdvancement, isPublicBracket })}
        confirmLabel="Close Voting"
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
        title="Open the next round?"
        body="This makes the closed round visible and opens voting for the advancing winners."
        confirmLabel="Open Next Round"
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
    ? [standardVoteAction, openNextRoundAction, standardShareAction]
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
        creatorVotesCast={usesManualAdvancement ? undefined : creatorVotesCast}
        activeRoundVoteGoal={usesManualAdvancement ? undefined : activeRoundVoteGoal}
        creatorIsDone={usesManualAdvancement ? undefined : creatorIsDone}
        summaryRows={standardSummaryRows}
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

function getCloseVotingClassName({ isPrivateBracket, standardVoteIsActionable }: { isPrivateBracket: boolean; standardVoteIsActionable: boolean }) {
  if (isPrivateBracket) return "ui-button ui-button-muted w-full";
  if (standardVoteIsActionable) return "ui-button ui-button-accent w-full";
  return "ui-button ui-button-primary w-full";
}

function getCloseVotingBody({ usesManualAdvancement, isPublicBracket }: { usesManualAdvancement: boolean; isPublicBracket: boolean }) {
  if (usesManualAdvancement) {
    return "This will close voting for the current bracket state and keep the winners you entered as the advancing entries.";
  }

  if (isPublicBracket) {
    return "This freezes the vote totals. You will open the next round when you are ready to reveal these results.";
  }

  return "This will close voting for the current round and open the next round with the advancing winners.";
}

function getShareActionLabel(sharingMode: string | null | undefined, hasShareLink: boolean) {
  if (sharingMode !== "with_friends") return "Copy Link";
  if (hasShareLink) return "Copy Link";
  return "Preparing";
}
