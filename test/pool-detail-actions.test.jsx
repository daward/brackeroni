import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PoolDetailActions } from "@/components/pools/detail";

const pool = {
  id: "pool-1",
  name: "Cartoons",
  candidateCount: 2,
  visibility: "private",
  candidates: [
    { id: "one", name: "Care Bears", tags: ["classic"], sourceUrl: "https://example.com", imageUrl: null },
    { id: "two", name: "Jem", tags: ["classic", "music"], imageUrl: "https://example.com/jem.jpg" },
  ],
};

function renderActions(overrides = {}) {
  const actions = {
    onViewTags: vi.fn(),
    onCopyLink: vi.fn(),
    onImport: vi.fn(),
    onEnrich: vi.fn(),
    onFillMissingImages: vi.fn(),
    onOpenMerge: vi.fn(),
    onMerge: vi.fn(),
    onArchive: vi.fn(),
  };
  render(<PoolDetailActions pool={pool} readOnly={false} isPending={() => false} isMergeOpen={false} mergePools={[]} {...actions} {...overrides} />);
  return actions;
}

describe("PoolDetailActions", () => {
  it("keeps tag viewing inside the kebab menu", async () => {
    const user = userEvent.setup();
    const actions = renderActions();

    expect(screen.queryByRole("button", { name: "View tags" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "More pool actions" }));
    await user.click(screen.getByRole("button", { name: "View tags" }));

    expect(actions.onViewTags).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("keeps the published pool menu visible while disabling mutations", async () => {
    const user = userEvent.setup();
    renderActions({ pool: { ...pool, visibility: "public_listed", isReadOnly: true }, readOnly: true });

    await user.click(screen.getByRole("button", { name: "More pool actions" }));

    expect(screen.getByRole("button", { name: "View tags" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Copy pool link" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Import candidates" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Enrich from links" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Fill missing images" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Merge another pool" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Archive pool" }).disabled).toBe(true);
  });
});
