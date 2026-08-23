"use client";

import { StatusActionRow, CloseVotingButton } from "./status-actions";
import { LiveAccordion, LiveSummaryCard } from "./status-layout-primitives";
import { DetailsPanel, ParticipationTrackerPanel } from "./status-participation";
import { TournamentActionGroup } from "./tournament-management";
import styles from "./management.module.css";
import type { ActiveParallelTournamentSectionProps } from "../types";

export function ActiveParallelTournamentSection({
  tournament,
  primaryActionHref,
  primaryActionLabel,
  activeShareLink,
  invitees,
  canCopyBracketLink,
  describeTournamentAudienceMode,
  formatBracketRuleLabel,
  isActionPending,
  onCopyShareLink,
  onCloseBracket,
  onArchiveTournament,
}: ActiveParallelTournamentSectionProps) {
  const viewerParallelBracketComplete = tournament.viewerParticipantStatus === "complete";
  const parallelResultsHref = tournament.viewerTournamentId ? `/results/${tournament.viewerTournamentId}` : `/results/${tournament.id}`;
  const parallelVoteAction = viewerParallelBracketComplete
    ? {
        key: `parallel-vote:${tournament.id}`,
        label: "Vote",
        disabled: true,
        disabledReason: "Your parallel ballot is already complete.",
        className: "ui-button ui-button-muted",
      }
    : {
        key: `parallel-vote:${tournament.id}`,
        href: primaryActionHref,
        label: primaryActionLabel,
        className: "cta-link ui-button ui-button-primary",
      };
  const parallelCloseAction = {
    key: `parallel-close-round:${tournament.id}`,
    render: () => (
      <CloseVotingButton
        label="Close Voting"
        className={viewerParallelBracketComplete ? "ui-button ui-button-primary w-full" : "ui-button ui-button-accent w-full"}
        title="Close voting for this bracket?"
        body="This will close voting for the entire parallel bracket. No more participant ballots will be accepted after this."
        confirmLabel="Close Voting"
        onConfirm={() => onCloseBracket(tournament.id)}
      />
    ),
  };
  const parallelResultsAction = {
    key: `parallel-results:${tournament.id}`,
    label: "Results",
    href: parallelResultsHref,
    className: "ui-button ui-button-accent",
  };
  const parallelShareAction = canCopyBracketLink(tournament)
    ? {
        key: `parallel-share:${tournament.id}`,
        label: getShareActionLabel(tournament.sharingMode, Boolean(activeShareLink)),
        onClick: () => onCopyShareLink(tournament.id),
        disabled: tournament.sharingMode === "with_friends" && isActionPending(`share-link:${tournament.id}`),
        className: "ui-button ui-button-accent",
      }
    : {
        key: `parallel-share:${tournament.id}`,
        label: "Copy Link",
        disabled: true,
        disabledReason: tournament.visibility === "private" ? "Private brackets do not expose a share link." : "A share link is not available for this bracket yet.",
        className: "ui-button ui-button-muted",
      };
  const parallelActions = [parallelVoteAction, parallelResultsAction, parallelCloseAction, parallelShareAction];

  const parallelSummaryRows = [
    {
      title: "Participants",
      meta: `${tournament.completedParticipantCount ?? 0} of ${tournament.participantCount ?? 0} finished`,
    },
  ];

  return (
    <div className={styles.statusStack}>
      <LiveSummaryCard
        kicker={`${describeTournamentAudienceMode(tournament)} Bracket Status`}
        body="This bracket is collecting personal rankings from each participant. Use this view to monitor completion and keep the round moving."
        actions={<StatusActionRow actions={parallelActions} />}
      />

      <LiveAccordion title="Bracket Actions" defaultOpen={false}>
        <TournamentActionGroup
          layout="row"
          align="start"
          actions={[
            {
              key: `parallel-archive:${tournament.id}`,
              label: isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive",
              onClick: () => onArchiveTournament(tournament.id, tournament.title),
              disabled: isActionPending(`archive-tournament:${tournament.id}`),
              className: "ui-button ui-button-muted",
            },
          ]}
        />
      </LiveAccordion>

      <ParticipationTrackerPanel tournament={tournament} invitees={invitees} summaryRows={parallelSummaryRows} />

      <DetailsPanel
        items={[
          formatBracketRuleLabel(tournament.playStyle),
          formatBracketRuleLabel(tournament.resultMode),
          formatBracketRuleLabel(tournament.tieBreakMode),
          `${tournament.entryCount} entries`,
          `${tournament.participantCount ?? 0} participants`,
        ]}
      />
    </div>
  );
}

function getShareActionLabel(sharingMode: string | null | undefined, hasShareLink: boolean) {
  if (sharingMode !== "with_friends") return "Copy Link";
  if (hasShareLink) return "Copy Link";
  return "Preparing";
}
