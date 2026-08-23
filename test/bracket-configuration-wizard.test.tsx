import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BracketCreationWizard } from "@/components/brackets/configuration";
import type { BracketCreationInput, BracketPoolOption } from "@/components/brackets/configuration";

const getPool = vi.fn();

vi.mock("@/lib/client-api/create-workspace", () => ({
  getPool: (...args: unknown[]) => getPool(...args),
  listPools: vi.fn().mockResolvedValue({ items: [], meta: { hasNextPage: false } }),
}));

const pool: BracketPoolOption = {
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
