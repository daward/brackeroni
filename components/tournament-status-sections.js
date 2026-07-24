"use client";

import { useState } from "react";
import { TournamentActionGroup, TournamentMetaRow } from "@/components/tournament-management";

function LiveAccordion({ title, defaultOpen = false, children }) {
  return (
    <details
      className="border border-[var(--line-strong)] bg-[rgba(255,255,255,0.045)]"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
        {title}
      </summary>
      <div className="border-t border-[var(--line-strong)] p-4">{children}</div>
    </details>
  );
}

function MutedSection({ title, body }) {
  return (
    <div className="border border-[var(--line)] bg-[rgba(255,255,255,0.02)] opacity-65">
      <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
        {title}
      </div>
      <div className="border-t border-[var(--line)] px-4 py-4">
        <p className="text-sm leading-6 text-[var(--muted)]">{body}</p>
      </div>
    </div>
  );
}

function LiveSummaryCard({
  kicker,
  body,
  actions = null
}) {
  return (
    <div className="border border-[var(--line-strong)] bg-[rgba(255,255,255,0.05)] p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
          {kicker}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--ink)]/88">{body}</p>
      </div>
      {actions ? <div className="mt-4 w-full">{actions}</div> : null}
    </div>
  );
}

function StatusActionRow({ actions }) {
  const [openReasonKey, setOpenReasonKey] = useState(null);
  const openReasonAction = actions.find(
    (action) => action?.disabled && action.key === openReasonKey
  );
  const actionSlotClassName = "shrink-0";
  const actionButtonClassName = "h-[3.25rem]";

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((action) => {
          if (!action) {
            return null;
          }

          if (action.render) {
            return (
              <div key={action.key} className={actionSlotClassName}>
                {action.render()}
              </div>
            );
          }

          if (action.disabled) {
            return (
              <button
                key={action.key}
                type="button"
                aria-haspopup="dialog"
                aria-label={action.disabledReason || action.label}
                onClick={() => setOpenReasonKey(action.key)}
                className={`${action.className || "ui-button ui-button-muted"} ${actionSlotClassName} ${actionButtonClassName} justify-center`}
              >
                {action.label}
              </button>
            );
          }

          if (action.href) {
            return (
              <a
                key={action.key}
                href={action.href}
                className={`${action.className} ${actionSlotClassName} ${actionButtonClassName} justify-center`}
              >
                {action.label}
              </a>
            );
          }

          return (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`${action.className} ${actionSlotClassName} ${actionButtonClassName} justify-center`}
            >
              {action.label}
            </button>
          );
        })}
      </div>
      {openReasonAction ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.72)] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`disabled-action-title-${openReasonAction.key}`}
          onClick={() => setOpenReasonKey(null)}
        >
          <div
            className="w-full max-w-sm border border-[var(--line-strong)] bg-[var(--panel)] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              id={`disabled-action-title-${openReasonAction.key}`}
              className="display-face text-lg font-black"
            >
              {openReasonAction.label}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/88">
              {openReasonAction.disabledReason || "This action is not available right now."}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenReasonKey(null)}
                className="ui-button ui-button-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CloseVotingButton({
  label = "Close Voting",
  className,
  disabled = false,
  disabledReason = "",
  title,
  body,
  confirmLabel = "Close Voting",
  onConfirm
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerClassName = `${className} h-[3.25rem] justify-center`;

  if (disabled) {
    return (
      <>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={disabledReason || label}
          onClick={() => setIsOpen(true)}
          className={triggerClassName}
        >
          {label}
        </button>
        {isOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.72)] px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-voting-disabled-title"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full max-w-sm border border-[var(--line-strong)] bg-[var(--panel)] p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <p id="close-voting-disabled-title" className="display-face text-lg font-black">
                {label}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--ink)]/88">
                {disabledReason || "This action is not available right now."}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="ui-button ui-button-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={triggerClassName}>
        {label}
      </button>
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.72)] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-voting-title"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md border border-[var(--line-strong)] bg-[var(--panel)] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="close-voting-title" className="display-face text-lg font-black">
              {title}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/88">
              {body}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ui-button ui-button-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onConfirm();
                }}
                className="ui-button ui-button-primary"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LiveInfoRow({ title, meta = null, action = null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--line)] bg-[rgba(255,255,255,0.055)] px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="display-face text-sm font-black">{title}</p>
        {meta ? (
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            {meta}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function ParticipationTrackerPanel({
  tournament,
  invitees,
  creatorVotesCast,
  activeRoundVoteGoal,
  creatorIsDone,
  summaryRows = []
}) {
  const isFriends = tournament.sharingMode === "with_friends";
  const isPrivate = tournament.visibility === "private";

  if (isPrivate) {
    return (
      <MutedSection
        title="Participation Tracker"
        body="Private brackets do not show participation tracking here."
      />
    );
  }

  return (
    <LiveAccordion title="Participation Tracker" defaultOpen={false}>
      <div className="space-y-2">
        {summaryRows.map((row) => (
          <LiveInfoRow
            key={row.title}
            title={row.title}
            meta={row.meta}
            action={row.action ?? null}
          />
        ))}

        {typeof creatorVotesCast === "number" && typeof activeRoundVoteGoal === "number" ? (
          <LiveInfoRow
            title="You"
            meta="Creator"
            action={
              <div className="text-right">
                <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                  {creatorVotesCast}/{activeRoundVoteGoal} votes
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {creatorIsDone ? "Ready" : "Waiting"}
                </p>
              </div>
            }
          />
        ) : null}

        {isFriends ? (
          invitees.length > 0 ? (
            invitees.map((invite) => {
              const isDone =
                invite.openMatchCount > 0 && invite.votesCast >= invite.openMatchCount;

              return (
                <LiveInfoRow
                  key={invite.id}
                  title={invite.name || invite.email || "Anonymous voter"}
                  meta={invite.email || invite.status}
                  action={
                    "votesCast" in invite && "openMatchCount" in invite ? (
                      <div className="text-right">
                        <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                          {invite.votesCast}/{invite.openMatchCount} votes
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {isDone ? "Ready" : "Waiting"}
                        </p>
                      </div>
                    ) : (
                      <span className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                        {invite.status}
                      </span>
                    )
                  }
                />
              );
            })
          ) : (
            <p className="text-sm text-[var(--muted)]">No invited voters have joined yet.</p>
          )
        ) : summaryRows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            This bracket is not in friends mode, so there is no per-person participation list.
          </p>
        ) : null}
      </div>
    </LiveAccordion>
  );
}

function DetailsPanel({ items }) {
  return (
    <div className="border border-[var(--line-strong)] bg-[rgba(255,255,255,0.05)] p-4">
      <TournamentMetaRow
        className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/80"
        items={items}
      />
    </div>
  );
}

function ManualResultQueue({ tournament, matches, isActionPending, onSetManualMatchWinner }) {
  const queueMatches = matches;

  return (
    <div className="space-y-3">
      {queueMatches.length > 0 ? (
        queueMatches.map((match) => {
          return (
            <div key={match.id} className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  onSetManualMatchWinner(
                    tournament.id,
                    match.id,
                    match.winnerEntryId === match.leftEntryId ? null : match.leftEntryId
                  )
                }
                disabled={isActionPending(`set-match-winner:${match.id}`)}
                className={`border px-4 py-3 text-left transition ${
                  match.winnerEntryId === match.leftEntryId
                    ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.08)]"
                    : "border-[var(--line-strong)] hover:border-[var(--accent-3)]"
                }`}
              >
                <p className="display-face text-sm font-black">{match.leftName}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Seed {match.leftSeed}
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  onSetManualMatchWinner(
                    tournament.id,
                    match.id,
                    match.winnerEntryId === match.rightEntryId ? null : match.rightEntryId
                  )
                }
                disabled={isActionPending(`set-match-winner:${match.id}`)}
                className={`border px-4 py-3 text-left transition ${
                  match.winnerEntryId === match.rightEntryId
                    ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.08)]"
                    : "border-[var(--line-strong)] hover:border-[var(--accent-3)]"
                }`}
              >
                <p className="display-face text-sm font-black">{match.rightName}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Seed {match.rightSeed}
                </p>
              </button>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-[var(--muted)]">No open matches in this round.</p>
      )}
    </div>
  );
}

export function CollapsedDraftTournamentSection({
  tournament,
  isPublishedTournament,
  canStartBracket,
  describeTournamentAudienceMode,
  formatBracketRuleLabel,
  isActionPending,
  onEditDraft,
  onStartTournament
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
      <TournamentMetaRow
        separator="slash"
        className="flex flex-wrap gap-2 text-sm uppercase tracking-[0.14em] text-[var(--muted)]"
        items={[
          describeTournamentAudienceMode(tournament),
          formatBracketRuleLabel(tournament.playStyle || "fixed_bracket"),
          formatBracketRuleLabel(tournament.resultMode || "winner_only"),
          `${tournament.entryCount} entries`
        ]}
      />
      <TournamentActionGroup
        layout="row"
        className="lg:justify-start"
        actions={[
          !isPublishedTournament
            ? {
                key: `edit-draft:${tournament.id}`,
                label: "Edit Draft",
                onClick: () => onEditDraft(tournament.id),
                className: "ui-button ui-button-accent"
              }
            : null,
          {
            key: `start:${tournament.id}`,
            label: isActionPending(`start-tournament:${tournament.id}`) ? "Starting" : "Start Bracket",
            onClick: () => onStartTournament(tournament.id),
            disabled: !canStartBracket || isActionPending(`start-tournament:${tournament.id}`),
            className: "ui-button ui-button-primary"
          }
        ]}
      />
    </div>
  );
}

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
  onArchiveTournament
}) {
  const viewerParallelBracketComplete = tournament.viewerParticipantStatus === "complete";
  const parallelResultsHref = tournament.viewerTournamentId
    ? `/results/${tournament.viewerTournamentId}`
    : `/results/${tournament.id}`;
  const parallelVoteAction = viewerParallelBracketComplete
    ? {
        key: `parallel-vote:${tournament.id}`,
        label: "Vote",
        disabled: true,
        disabledReason: "Your parallel ballot is already complete.",
        className: "ui-button ui-button-muted"
      }
    : {
        key: `parallel-vote:${tournament.id}`,
        href: primaryActionHref,
        label: primaryActionLabel,
        className: "cta-link ui-button ui-button-primary"
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
    )
  };
  const parallelResultsAction = {
    key: `parallel-results:${tournament.id}`,
    label: "Results",
    href: parallelResultsHref,
    className: "ui-button ui-button-accent"
  };
  const parallelShareAction = canCopyBracketLink(tournament)
    ? {
        key: `parallel-share:${tournament.id}`,
        label:
          tournament.sharingMode === "with_friends"
            ? activeShareLink
              ? "Copy Link"
              : "Preparing"
            : "Copy Link",
        onClick: () => onCopyShareLink(tournament.id),
        disabled:
          tournament.sharingMode === "with_friends" &&
          isActionPending(`share-link:${tournament.id}`),
        className: "ui-button ui-button-accent"
      }
    : {
        key: `parallel-share:${tournament.id}`,
        label: "Copy Link",
        disabled: true,
        disabledReason:
          tournament.visibility === "private"
            ? "Private brackets do not expose a share link."
            : "A share link is not available for this bracket yet.",
        className: "ui-button ui-button-muted"
      };
  const parallelActions = [
    parallelVoteAction,
    parallelResultsAction,
    parallelCloseAction,
    parallelShareAction
  ];

  const parallelSummaryRows = [
    {
      title: "Participants",
      meta: `${tournament.completedParticipantCount ?? 0} of ${tournament.participantCount ?? 0} finished`
    }
  ];

  return (
    <div className="space-y-4">
      <LiveSummaryCard
        kicker={`${describeTournamentAudienceMode(tournament)} Bracket Status`}
        body="This bracket is collecting personal rankings from each participant. Use this view to monitor completion and keep the round moving."
        actions={<StatusActionRow actions={parallelActions} />}
      />

      <LiveAccordion title="Bracket Actions" defaultOpen={false}>
        <TournamentActionGroup
          actions={[
            {
              key: `parallel-archive:${tournament.id}`,
              label: isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive",
              onClick: () => onArchiveTournament(tournament.id, tournament.title),
              disabled: isActionPending(`archive-tournament:${tournament.id}`),
              className: "ui-button ui-button-muted w-full"
            }
          ]}
        />
      </LiveAccordion>

      <ParticipationTrackerPanel
        tournament={tournament}
        invitees={invitees}
        summaryRows={parallelSummaryRows}
      />

      <DetailsPanel
        items={[
          formatBracketRuleLabel(tournament.playStyle),
          formatBracketRuleLabel(tournament.resultMode),
          formatBracketRuleLabel(tournament.tieBreakMode),
          `${tournament.entryCount} entries`,
          `${tournament.participantCount ?? 0} participants`
        ]}
      />
    </div>
  );
}

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
  onCopyShareLink,
  onSetManualMatchWinner,
  onRerunTournament,
  onArchiveTournament
}) {
  const usesManualAdvancement = tournament.advancementMode === "manual_winner";
  const currentRoundMatches = (activeRoundMatches || []).filter((match) => match.status === "open");
  const completedManualResults = currentRoundMatches.filter((match) => match.winnerEntryId).length;
  const unresolvedManualCount = currentRoundMatches.filter((match) => !match.winnerEntryId).length;
  const roundVoteTotal = currentRoundMatches.reduce(
    (sum, match) => sum + (match.leftVoteCount ?? 0) + (match.rightVoteCount ?? 0),
    0
  );
  const activeVotedMatchCount = currentRoundMatches.filter(
    (match) => (match.leftVoteCount ?? 0) + (match.rightVoteCount ?? 0) > 0
  ).length;
  const standardSummaryRows = usesManualAdvancement
    ? [
        {
          title: "Winners Entered",
          meta: `${completedManualResults} of ${activeRoundVoteGoal} entered`
        },
        {
          title: "Round Status",
          meta:
            unresolvedManualCount > 0
              ? `${unresolvedManualCount} matchups still need winners`
              : "Every current matchup has a winner"
        }
      ]
    : [
        {
          title: "Round Votes",
          meta:
            roundVoteTotal > 0
              ? `${roundVoteTotal} votes cast so far`
              : "No votes cast yet this round"
        },
        {
          title: "Matchup Activity",
          meta:
            activeRoundVoteGoal > 0
              ? `${activeVotedMatchCount} of ${activeRoundVoteGoal} matchups have votes`
              : "No open matchups in this round"
        }
      ];
  const canCloseManualVoting = unresolvedManualCount === 0;
  const standardVoteIsActionable = hasOpenVotes;
  const standardVoteAction = hasOpenVotes
    ? {
        key: `vote:${tournament.id}`,
        href: `/vote?tournament=${tournament.id}&returnTo=create`,
        label: "Vote",
        className: "cta-link ui-button ui-button-primary"
      }
    : {
        key: `vote-closed:${tournament.id}`,
        label: "Vote",
        disabled: true,
        disabledReason: creatorIsDone
          ? "You already voted in the currently available matchup."
          : "There are no open matchups to vote on right now.",
        className: "ui-button ui-button-muted"
      };
  const standardResultsAction = {
    key: `results:${tournament.id}`,
    label: "Results",
    ...(tournament.status === "complete"
      ? {
          href: `/results/${tournament.id}`,
          className: "ui-button ui-button-accent"
        }
      : {
          disabled: true,
          disabledReason:
            "Bracket results are only available after the bracket closes. Use Rounds while voting is still in progress.",
          className: "ui-button ui-button-muted"
        })
  };
  const standardCloseAction = {
    key: `close-round:${tournament.id}`,
    render: () => (
      <CloseVotingButton
        label="Close Voting"
        className={standardVoteIsActionable ? "ui-button ui-button-accent w-full" : "ui-button ui-button-primary w-full"}
        disabled={usesManualAdvancement ? !canCloseManualVoting : isActionPending(`close-round:${tournament.id}`)}
        disabledReason={
          usesManualAdvancement && !canCloseManualVoting
            ? "Pick winners for every open matchup before closing voting."
            : ""
        }
        title="Close voting for this round?"
        body={
          usesManualAdvancement
            ? "This will close voting for the current bracket state and keep the winners you entered as the advancing entries."
            : "This will close voting for the current round and open the next round with the advancing winners."
        }
        confirmLabel="Close Voting"
        onConfirm={() => onCloseCurrentRound(tournament.id)}
      />
    )
  };
  const standardShareAction = canCopyBracketLink(tournament)
    ? {
        key: `share:${tournament.id}`,
        label:
          tournament.sharingMode === "with_friends"
            ? activeShareLink
              ? "Copy Link"
              : "Preparing"
            : "Copy Link",
        onClick: () => onCopyShareLink(tournament.id),
        disabled:
          tournament.sharingMode === "with_friends" &&
          isActionPending(`share-link:${tournament.id}`),
        className: "ui-button ui-button-accent"
      }
    : {
        key: `share:${tournament.id}`,
        label: "Copy Link",
        disabled: true,
        disabledReason:
          tournament.visibility === "private"
            ? "Private brackets do not expose a share link."
            : "A share link is not available for this bracket yet.",
        className: "ui-button ui-button-muted"
      };
  const standardActions = [
    standardVoteAction,
    standardResultsAction,
    standardCloseAction,
    standardShareAction
  ];

  return (
    <div className="space-y-4">
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
          <ManualResultQueue
            tournament={tournament}
            matches={currentRoundMatches}
            isActionPending={isActionPending}
            onSetManualMatchWinner={onSetManualMatchWinner}
          />
        </LiveAccordion>
      ) : null}

      <LiveAccordion title="Bracket Actions" defaultOpen={false}>
        <TournamentActionGroup
          actions={[
            {
              key: `rerun:${tournament.id}`,
              label: isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Rerun",
              onClick: () => onRerunTournament(tournament.id),
              disabled: isActionPending(`rerun-tournament:${tournament.id}`),
              className: "ui-button ui-button-accent w-full"
            },
            {
              key: `archive:${tournament.id}`,
              label: isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive",
              onClick: () => onArchiveTournament(tournament.id, tournament.title),
              disabled: isActionPending(`archive-tournament:${tournament.id}`),
              className: "ui-button ui-button-muted w-full"
            }
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
          `${tournament.entryCount} entries`
        ]}
      />
    </div>
  );
}

export function CompletedTournamentSection({
  tournament,
  hasSourcePool,
  formatBracketRuleLabel,
  isActionPending,
  onRerunTournament,
  onArchiveTournament
}) {
  const resultsHref =
    tournament.kind === "parallel_parent" && tournament.viewerTournamentId
      ? `/results/${tournament.id}`
      : `/results/${tournament.id}`;

  return (
    <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-2">
        {tournament.winnerName ? (
          <p className="completed-bracket-winner">
            Winner: {tournament.winnerName}
            {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
          </p>
        ) : null}
        {hasSourcePool ? (
          <TournamentMetaRow
            separator="slash"
            className="results-meta flex flex-wrap gap-2"
            items={[
              formatBracketRuleLabel(tournament.resultMode),
              `${tournament.entryCount} entries`
            ]}
          />
        ) : null}
      </div>
      <TournamentActionGroup
        layout="row"
        actions={[
          {
            key: `complete-results:${tournament.id}`,
            href: resultsHref,
            label: "Results",
            className: "ui-button ui-button-accent"
          },
          {
            key: `complete-rerun:${tournament.id}`,
            label: isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Run Again",
            onClick: () => onRerunTournament(tournament.id),
            disabled: isActionPending(`rerun-tournament:${tournament.id}`),
            className: "ui-button ui-button-accent"
          },
          {
            key: `complete-archive:${tournament.id}`,
            label: isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive",
            onClick: () => onArchiveTournament(tournament.id, tournament.title),
            disabled: isActionPending(`archive-tournament:${tournament.id}`),
            className: "ui-button ui-button-muted"
          }
        ]}
      />
    </div>
  );
}
