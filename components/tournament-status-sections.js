"use client";

import { TournamentActionGroup, TournamentMetaRow } from "@/components/tournament-management";

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
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[14rem_minmax(0,1fr)] xl:items-start">
      <TournamentActionGroup
        actions={[
          {
            key: `parallel-primary:${tournament.id}`,
            href: primaryActionHref,
            label: primaryActionLabel,
            className: "cta-link ui-button ui-button-primary w-full"
          },
          {
            key: `parallel-results:${tournament.id}`,
            href: `/results/${tournament.id}`,
            label: "Results",
            className: "ui-button ui-button-accent w-full"
          },
          canCopyBracketLink(tournament)
            ? {
                key: `parallel-copy:${tournament.id}`,
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
                className: "ui-button ui-button-accent w-full"
              }
            : null,
          {
            key: `parallel-close:${tournament.id}`,
            label: isActionPending(`update-tournament:${tournament.id}`) ? "Closing" : "Close Bracket",
            onClick: () => onCloseBracket(tournament.id),
            disabled: isActionPending(`update-tournament:${tournament.id}`),
            className: "ui-button ui-button-muted w-full"
          },
          {
            key: `parallel-archive:${tournament.id}`,
            label: isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive",
            onClick: () => onArchiveTournament(tournament.id, tournament.title),
            disabled: isActionPending(`archive-tournament:${tournament.id}`),
            className: "ui-button ui-button-muted w-full"
          }
        ]}
      />
      <div>
        <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
                Participant Progress
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Each participant votes through a personal full-ranking bracket. The parent bracket aggregates those final rankings.
              </p>
            </div>
            <div className="text-right">
              <p className="display-face text-lg font-black text-[var(--accent-2)]">
                {tournament.completedParticipantCount ?? 0}/{tournament.participantCount ?? 0}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                complete
              </p>
            </div>
          </div>
        </div>
        <TournamentMetaRow
          className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]"
          items={[
            describeTournamentAudienceMode(tournament),
            formatBracketRuleLabel(tournament.resultMode),
            formatBracketRuleLabel(tournament.tieBreakMode),
            `${tournament.entryCount} entries`,
            `${tournament.participantCount ?? 0} participants`
          ]}
        />
        {invitees.length > 0 ? (
          <div className="mt-4 space-y-2">
            {invitees.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="display-face truncate text-sm font-black">
                    {invite.name || invite.email || "Anonymous voter"}
                  </p>
                  {invite.email ? (
                    <p className="mt-1 truncate text-xs tracking-[0.08em] text-[var(--muted)]">
                      {invite.email}
                    </p>
                  ) : null}
                </div>
                <span className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                  {invite.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ActiveStandardTournamentSection({
  tournament,
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
  onRerunTournament,
  onArchiveTournament
}) {
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[14rem_minmax(0,1fr)] xl:items-start">
      <TournamentActionGroup
        actions={[
          hasOpenVotes
            ? {
                key: `vote:${tournament.id}`,
                href: `/vote?tournament=${tournament.id}&returnTo=create`,
                label: "Vote Now",
                className: "cta-link ui-button ui-button-primary w-full"
              }
            : {
                key: `no-open:${tournament.id}`,
                label: "No Open Matches",
                disabled: true,
                className: "ui-button ui-button-primary w-full"
              },
          {
            key: `close-round:${tournament.id}`,
            label: isActionPending(`close-round:${tournament.id}`) ? "Closing Round" : "Close Current Round",
            onClick: () => onCloseCurrentRound(tournament.id),
            disabled: isActionPending(`close-round:${tournament.id}`),
            className: "ui-button ui-button-muted w-full"
          },
          canCopyBracketLink(tournament)
            ? {
                key: `copy:${tournament.id}`,
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
                className: "ui-button ui-button-accent w-full"
              }
            : null,
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
      <div>
        <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
                Current Round
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {tournament.activeRoundNumber
                  ? `Round ${tournament.activeRoundNumber}`
                  : "Waiting for the next round to open."}
              </p>
            </div>
            <div className="text-right">
              <p className="display-face text-lg font-black text-[var(--accent-2)]">
                {activeRoundVoteGoal}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {activeRoundVoteGoal === 1 ? "Open match" : "Open matches"}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
              <div className="min-w-0">
                <p className="display-face truncate text-sm font-black">You</p>
                <p className="mt-1 truncate text-xs tracking-[0.08em] text-[var(--muted)]">
                  Creator
                </p>
              </div>
              <div className="text-right">
                <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                  {creatorVotesCast}/{activeRoundVoteGoal} votes
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {creatorIsDone ? "Ready" : "Waiting"}
                </p>
              </div>
            </div>
            {tournament.sharingMode === "with_friends" ? (
              invitees.length > 0 ? (
                invitees.map((invite) => {
                  const isDone = invite.openMatchCount > 0 && invite.votesCast >= invite.openMatchCount;

                  return (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="display-face truncate text-sm font-black">
                          {invite.name || invite.email}
                        </p>
                        <p className="mt-1 truncate text-xs tracking-[0.08em] text-[var(--muted)]">
                          {invite.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                          {invite.votesCast}/{invite.openMatchCount} votes
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {isDone ? "Ready" : "Waiting"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--muted)]">No invited voters have joined yet.</p>
              )
            ) : null}
          </div>
        </div>
        <TournamentMetaRow
          className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]"
          items={[
            describeTournamentAudienceMode(tournament),
            formatBracketRuleLabel(tournament.playStyle),
            formatBracketRuleLabel(tournament.resultMode),
            formatBracketRuleLabel(tournament.tieBreakMode)
          ]}
        />
      </div>
    </div>
  );
}

export function CompletedTournamentSection({
  tournament,
  activeShareLink,
  hasSourcePool,
  canCopyBracketLink,
  describeTournamentAudienceMode,
  formatBracketRuleLabel,
  isActionPending,
  onCopyShareLink,
  onRerunTournament,
  onArchiveTournament
}) {
  return (
    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-3">
        {tournament.winnerName ? (
          <p className="display-face text-lg font-black text-[var(--accent-3)]">
            Winner: {tournament.winnerName}
            {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
          </p>
        ) : null}
        {hasSourcePool ? (
          <TournamentMetaRow
            separator="slash"
            className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]"
            items={[
              describeTournamentAudienceMode(tournament),
              formatBracketRuleLabel(tournament.playStyle),
              formatBracketRuleLabel(tournament.resultMode),
              formatBracketRuleLabel(tournament.tieBreakMode),
              `${tournament.entryCount} entries`
            ]}
          />
        ) : null}
      </div>
      <TournamentActionGroup
        layout="row"
        actions={[
          canCopyBracketLink(tournament)
            ? {
                key: `complete-copy:${tournament.id}`,
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
            : null,
          {
            key: `complete-results:${tournament.id}`,
            href: `/results/${tournament.id}`,
            label: "Results",
            className: "ui-button ui-button-accent"
          },
          {
            key: `complete-rerun:${tournament.id}`,
            label: isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Rerun",
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
