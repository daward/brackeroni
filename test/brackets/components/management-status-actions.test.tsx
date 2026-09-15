import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActiveParallelTournamentSection, ActiveStandardTournamentSection, CloseVotingButton, StatusActionRow } from "@/components/brackets/management";

describe("bracket management status actions", () => {
  it("traps focus in the confirmation dialog and restores it after Escape", async () => {
    const user = userEvent.setup();
    render(<CloseVotingButton className="ui-button ui-button-primary" title="Close voting?" body="This cannot be undone." onConfirm={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Close Voting" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Close voting?" });
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const confirm = within(dialog).getByRole("button", {
      name: "Close Voting",
    });
    expect(document.activeElement).toBe(cancel);

    await user.tab();
    expect(document.activeElement).toBe(confirm);
    await user.tab();
    expect(document.activeElement).toBe(cancel);

    await user.keyboard("{Escape}");
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("explains why an unavailable action cannot be used", async () => {
    const user = userEvent.setup();
    render(
      <StatusActionRow
        actions={[
          {
            key: "results",
            label: "Results",
            disabled: true,
            disabledReason: "Results are available after the bracket closes.",
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Results are available after the bracket closes.",
      }),
    );

    expect(screen.getByRole("dialog", { name: "Results" })).not.toBeNull();
    expect(screen.getByText("Results are available after the bracket closes.")).not.toBeNull();
  });

  it("keeps live bracket voting inside the management page", async () => {
    const user = userEvent.setup();
    const onVoteCurrentRound = vi.fn();

    render(
      <ActiveStandardTournamentSection
        tournament={{
          id: "bracket-1",
          title: "Dinner",
          status: "active",
          createdAt: "2026-01-01",
          visibility: "public_listed",
          sharingMode: "private",
          advancementMode: "vote_winner",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins",
          activeRoundNumber: 1,
          entryCount: 2,
          winner: null,
        }}
        activeRoundMatches={[
          {
            id: "match-1",
            status: "open",
            roundNumber: 1,
            left: { id: "left-entry", name: "Pizza", seed: 1 },
            right: { id: "right-entry", name: "Tacos", seed: 2 },
          },
        ]}
        hasOpenVotes
        activeRoundVoteGoal={1}
        creatorVotesCast={0}
        creatorIsDone={false}
        activeShareLink={null}
        invitees={[]}
        canCopyBracketLink={() => true}
        describeTournamentAudienceMode={() => "Public"}
        formatBracketRuleLabel={(value) => value || ""}
        isActionPending={() => false}
        onCloseCurrentRound={vi.fn()}
        onOpenNextRound={vi.fn()}
        onVoteCurrentRound={onVoteCurrentRound}
        onCopyShareLink={vi.fn()}
        onSetManualMatchWinner={vi.fn()}
        onRerunTournament={vi.fn()}
        onArchiveTournament={vi.fn()}
      />,
    );

    const voteAction = screen.getByRole("button", { name: "Vote" });
    expect(voteAction.closest("a")).toBeNull();

    await user.click(voteAction);
    await user.click(screen.getByRole("button", { name: /Pizza/ }));

    expect(onVoteCurrentRound).toHaveBeenCalledWith("bracket-1", "match-1", "left-entry");
  });

  it("offers review and reveal actions after public voting closes", () => {
    render(
      <ActiveStandardTournamentSection
        tournament={{
          id: "bracket-1",
          title: "Dinner",
          status: "active",
          createdAt: "2026-01-01",
          visibility: "public_listed",
          sharingMode: "private",
          advancementMode: "vote_winner",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins",
          activeRoundNumber: 1,
          entryCount: 2,
          hasUnrevealedClosedRounds: true,
          winner: null,
        }}
        activeRoundMatches={[
          {
            id: "match-1",
            status: "closed",
            roundNumber: 1,
            roundStatus: "closed",
            left: { id: "left-entry", name: "Pizza", seed: 1, voteCount: 3 },
            right: { id: "right-entry", name: "Tacos", seed: 2, voteCount: 1 },
            winnerEntryId: "left-entry",
          },
        ]}
        hasOpenVotes={false}
        activeRoundVoteGoal={0}
        creatorVotesCast={0}
        creatorIsDone={false}
        activeShareLink={null}
        invitees={[]}
        canCopyBracketLink={() => true}
        describeTournamentAudienceMode={() => "Public"}
        formatBracketRuleLabel={(value) => value || ""}
        isActionPending={() => false}
        onCloseCurrentRound={vi.fn()}
        onOpenNextRound={vi.fn()}
        onVoteCurrentRound={vi.fn()}
        onCopyShareLink={vi.fn()}
        onSetManualMatchWinner={vi.fn()}
        onRerunTournament={vi.fn()}
        onArchiveTournament={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "Results" }).getAttribute("href")).toBe("/results/bracket-1");
    expect(screen.getByRole("button", { name: "Open Next Round" })).not.toBeNull();
  });

  it("shows when participation stats were updated and lets managers refresh them", async () => {
    const user = userEvent.setup();
    const onRefreshParticipation = vi.fn();

    render(
      <ActiveStandardTournamentSection
        tournament={{
          id: "bracket-1",
          title: "Dinner",
          status: "active",
          createdAt: "2026-01-01",
          visibility: "public_listed",
          sharingMode: "private",
          advancementMode: "vote_winner",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins",
          activeRoundNumber: 1,
          entryCount: 4,
          winner: null,
        }}
        activeRoundMatches={[]}
        hasOpenVotes={false}
        activeRoundVoteGoal={2}
        creatorVotesCast={1}
        creatorIsDone={false}
        activeShareLink={null}
        invitees={[]}
        participationUpdatedAt="2026-01-01T15:04:00.000Z"
        canCopyBracketLink={() => true}
        describeTournamentAudienceMode={() => "Public"}
        formatBracketRuleLabel={(value) => value || ""}
        isActionPending={() => false}
        onCloseCurrentRound={vi.fn()}
        onOpenNextRound={vi.fn()}
        onVoteCurrentRound={vi.fn()}
        onCopyShareLink={vi.fn()}
        onRefreshParticipation={onRefreshParticipation}
        onSetManualMatchWinner={vi.fn()}
        onRerunTournament={vi.fn()}
        onArchiveTournament={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Participation Tracker"));
    expect(screen.getByText(/Stats updated/)).not.toBeNull();
    expect(screen.getByText("Votes Cast")).not.toBeNull();
    expect(screen.getByText("0")).not.toBeNull();
    expect(screen.getByText("Matchup Activity")).not.toBeNull();
    expect(screen.getByText("0 out of 2 with votes")).not.toBeNull();
    expect(screen.getByText("Your Matchup Activity")).not.toBeNull();
    expect(screen.getByText("1 out of 2 with votes")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Refresh stats" }));

    expect(onRefreshParticipation).toHaveBeenCalledWith("bracket-1");
  });

  it("explains parallel bracket participation as ballot completion", async () => {
    const user = userEvent.setup();

    render(
      <ActiveParallelTournamentSection
        tournament={{
          id: "parallel-1",
          title: "Sandwiches",
          status: "active",
          createdAt: "2026-01-01",
          visibility: "public_listed",
          sharingMode: "private",
          playStyle: "fixed_bracket",
          resultMode: "parallel_full_ranking",
          tieBreakMode: "higher_seed_wins",
          entryCount: 90,
          participantCount: 44,
          completedParticipantCount: 0,
          winner: null,
        }}
        primaryActionLabel="Vote"
        activeShareLink={null}
        invitees={[]}
        canCopyBracketLink={() => true}
        describeTournamentAudienceMode={() => "Public"}
        formatBracketRuleLabel={(value) => value || ""}
        isActionPending={() => false}
        onVote={vi.fn()}
        onCopyShareLink={vi.fn()}
        onRefreshParticipation={vi.fn()}
        onCloseBracket={vi.fn()}
        onArchiveTournament={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Participation Tracker"));

    expect(screen.getByText("Total Participants").closest("div")?.parentElement?.textContent).toContain("44");
    expect(screen.getByText("Finished Ballots").closest("div")?.parentElement?.textContent).toContain("0");
    expect(screen.getByText("Still Waiting").closest("div")?.parentElement?.textContent).toContain("44");
  });

  it("lets private bracket creators close voting as the primary action", async () => {
    const user = userEvent.setup();
    const onCloseCurrentRound = vi.fn();

    render(
      <ActiveStandardTournamentSection
        tournament={{
          id: "bracket-1",
          title: "Dinner",
          status: "active",
          createdAt: "2026-01-01",
          visibility: "private",
          sharingMode: "private",
          advancementMode: "vote_winner",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins",
          activeRoundNumber: 1,
          entryCount: 2,
          winner: null,
        }}
        activeRoundMatches={[
          {
            id: "match-1",
            status: "open",
            roundNumber: 1,
            left: { id: "left-entry", name: "Pizza", seed: 1, voteCount: 1 },
            right: { id: "right-entry", name: "Tacos", seed: 2, voteCount: 0 },
            userVoteEntryId: "left-entry",
          },
        ]}
        hasOpenVotes={false}
        activeRoundVoteGoal={1}
        creatorVotesCast={1}
        creatorIsDone
        activeShareLink={null}
        invitees={[]}
        canCopyBracketLink={() => false}
        describeTournamentAudienceMode={() => "Private"}
        formatBracketRuleLabel={(value) => value || ""}
        isActionPending={() => false}
        onCloseCurrentRound={onCloseCurrentRound}
        onOpenNextRound={vi.fn()}
        onVoteCurrentRound={vi.fn()}
        onCopyShareLink={vi.fn()}
        onSetManualMatchWinner={vi.fn()}
        onRerunTournament={vi.fn()}
        onArchiveTournament={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close Voting" }));
    await user.click(within(screen.getByRole("dialog", { name: "Close Voting?" })).getByRole("button", { name: "Close Voting" }));

    expect(onCloseCurrentRound).toHaveBeenCalledWith("bracket-1");
  });

  it("labels non-final closures as closing the round", async () => {
    const user = userEvent.setup();
    const onCloseCurrentRound = vi.fn();

    render(
      <ActiveStandardTournamentSection
        tournament={{
          id: "bracket-1",
          title: "Dinner",
          status: "active",
          createdAt: "2026-01-01",
          visibility: "private",
          sharingMode: "private",
          advancementMode: "vote_winner",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins",
          activeRoundNumber: 1,
          entryCount: 8,
          winner: null,
        }}
        activeRoundMatches={[
          {
            id: "match-1",
            status: "open",
            roundNumber: 1,
            left: { id: "left-entry", name: "Pizza", seed: 1, voteCount: 1 },
            right: { id: "right-entry", name: "Tacos", seed: 8, voteCount: 0 },
            userVoteEntryId: "left-entry",
          },
        ]}
        hasOpenVotes={false}
        activeRoundVoteGoal={1}
        creatorVotesCast={1}
        creatorIsDone
        activeShareLink={null}
        invitees={[]}
        canCopyBracketLink={() => false}
        describeTournamentAudienceMode={() => "Private"}
        formatBracketRuleLabel={(value) => value || ""}
        isActionPending={() => false}
        onCloseCurrentRound={onCloseCurrentRound}
        onOpenNextRound={vi.fn()}
        onVoteCurrentRound={vi.fn()}
        onCopyShareLink={vi.fn()}
        onSetManualMatchWinner={vi.fn()}
        onRerunTournament={vi.fn()}
        onArchiveTournament={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close Round" }));
    await user.click(within(screen.getByRole("dialog", { name: "Close Round?" })).getByRole("button", { name: "Close Round" }));

    expect(onCloseCurrentRound).toHaveBeenCalledWith("bracket-1");
  });
});
