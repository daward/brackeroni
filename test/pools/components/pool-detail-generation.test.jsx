import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PoolDetailWorkspace } from "@/components/pools/detail";
import { getPool } from "@/lib/client-api/create-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/client-api/create-workspace", () => ({
  createCandidateInPool: vi.fn(),
  generateCandidatesInPool: vi.fn(),
  getPool: vi.fn(),
  mergePoolsIntoPool: vi.fn(),
  removeCandidateFromPool: vi.fn(),
  removeLowValueTagsFromPool: vi.fn(),
  removeTagFromPool: vi.fn(),
  suggestImages: vi.fn(),
  updateCandidateInPool: vi.fn(),
  updatePool: vi.fn(),
}));

describe("PoolDetailWorkspace AI generation", () => {
  const pool = {
    id: "pool-1",
    name: "Best Disney Songs",
    description: null,
    visibility: "private",
    candidateCount: 0,
    candidates: [],
    candidatePagination: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockResolvedValue({ item: pool });
  });

  it("uses the pool title as the default generation prompt", async () => {
    const user = userEvent.setup();
    render(<PoolDetailWorkspace initialPool={pool} />);

    await user.click(screen.getByRole("button", { name: "Generate with AI" }));

    expect(screen.getByLabelText("Prompt").value).toBe("Best Disney Songs");
  });
});
