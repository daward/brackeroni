import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BracketCreationWizard } from "@/components/brackets/configuration";
import type { BracketCreationInput } from "@/components/brackets/configuration";
import type { PoolSelectionOption } from "@/lib/pools/types";

const getPool = vi.fn();

vi.mock("@/lib/client-api/create-workspace", () => ({
  getPool: (...args: unknown[]) => getPool(...args),
  listPools: vi.fn().mockResolvedValue({ items: [], meta: { hasNextPage: false } }),
}));

const pool: PoolSelectionOption = {
  id: "pool-1",
  name: "Dinner Pool",
  description: "Places to eat",
  candidateCount: 4,
};

describe("bracket configuration wizard", () => {
  it("submits an existing pool with the selected wizard settings", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn<(_: BracketCreationInput) => Promise<boolean>>().mockResolvedValue(true);

    render(<BracketCreationWizard pools={[pool]} creating={false} onCancel={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: /Dinner Pool/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByPlaceholderText("Dinner Pool Bracket"), "Dinner Finals");
    await user.click(screen.getByRole("button", { name: "Create bracket" }));

    expect(onCreate).toHaveBeenCalledWith({
      title: "Dinner Finals",
      source: { type: "existing", pool },
      playStyle: "fixed_bracket",
      resultMode: "winner_only",
      advancementMode: "vote_winner",
      tieBreakMode: "higher_seed_wins",
      seedingMode: "pool_order",
      seedCandidateIds: null,
      audienceMode: "private",
    });
  });

  it("blocks existing pools that do not have enough candidates", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn<(_: BracketCreationInput) => Promise<boolean>>().mockResolvedValue(true);

    render(<BracketCreationWizard pools={[{ ...pool, candidateCount: 1 }]} creating={false} onCancel={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: /Dinner Pool/ }));

    expect(screen.getByText("Add at least two candidates to this pool before creating a bracket.")).not.toBeNull();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("reports accepted wizard step changes for route history", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();

    render(<BracketCreationWizard pools={[pool]} creating={false} onCancel={vi.fn()} onCreate={vi.fn()} onStepChange={onStepChange} />);

    await user.click(screen.getByRole("button", { name: /Dinner Pool/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onStepChange).toHaveBeenNthCalledWith(1, 1);
    expect(onStepChange).toHaveBeenNthCalledWith(2, 2);
    expect(onStepChange).toHaveBeenNthCalledWith(3, 1);
  });

  it("shows voting effort estimates on the results step", async () => {
    const user = userEvent.setup();

    render(<BracketCreationWizard pools={[pool]} creating={false} onCancel={vi.fn()} onCreate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Dinner Pool/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Effort estimate")).not.toBeNull();
    expect(screen.getByText("Based on 4 contenders. Byes do not require votes, so the estimate counts only contested matchups.")).not.toBeNull();
    expect(screen.getByText("~3 per participant")).not.toBeNull();
    expect(screen.getByText("~2")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Faster rounds/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Independent rankings/ })).toBeNull();
  });

  it("updates voting effort estimates when ranking mode changes", async () => {
    const user = userEvent.setup();

    render(<BracketCreationWizard pools={[pool]} creating={false} onCancel={vi.fn()} onCreate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Dinner Pool/ }));
    await user.click(screen.getByRole("button", { name: /Share with friends/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: /A ranking/ }));

    expect(screen.getByText("~5 per participant")).not.toBeNull();
    expect(screen.getByText("~4")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Faster rounds/ })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Independent rankings/ })).not.toBeNull();
  });

  it("shows concise review choices and lets settings navigate back to their wizard step", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();

    render(<BracketCreationWizard pools={[pool]} creating={false} onCancel={vi.fn()} onCreate={vi.fn()} onStepChange={onStepChange} />);

    await user.click(screen.getByRole("button", { name: /Dinner Pool/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const winnersReviewCard = screen.getAllByRole("button", { name: /Winners/i })[1];
    expect(winnersReviewCard).not.toBeNull();
    expect(screen.getByText("Highest vote total, with ties broken by higher seed")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /Seeding/i })[1]).not.toBeNull();
    expect(screen.getByText("fixed bracket, seeded by pool order")).not.toBeNull();
    expect(screen.getByText("4 contenders")).not.toBeNull();
    expect(screen.queryByText("Only you can see and run it.")).toBeNull();
    expect(screen.queryByText("The bracket ends with one champion.")).toBeNull();
    expect(screen.getAllByText("Edit")).toHaveLength(5);

    await user.click(winnersReviewCard);

    expect(onStepChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByText("How will each matchup be decided?")).not.toBeNull();
  });

  it("does not report blocked wizard step changes", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();

    render(<BracketCreationWizard pools={[pool]} creating={false} onCancel={vi.fn()} onCreate={vi.fn()} onStepChange={onStepChange} />);

    await user.click(screen.getByRole("button", { name: /\+Add a pool/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Give the new pool a name.")).not.toBeNull();
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it("submits custom seed ids for an existing pool", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn<(_: BracketCreationInput) => Promise<boolean>>().mockResolvedValue(true);
    getPool.mockResolvedValueOnce({
      item: {
        candidates: [
          { id: "candidate-1", name: "Alpha" },
          { id: "candidate-2", name: "Bravo" },
          { id: "candidate-3", name: "Charlie" },
        ],
      },
    });

    render(<BracketCreationWizard pools={[pool]} creating={false} onCancel={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: /Dinner Pool/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: /Customize seeds/ }));
    expect(await screen.findByText("Alpha")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Create bracket" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        seedingMode: "custom",
        seedCandidateIds: ["candidate-1", "candidate-2", "candidate-3"],
      }),
    );
  });
});
