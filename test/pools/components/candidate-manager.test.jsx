import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CandidateManagerPanel } from "@/components/pools/candidates";

const candidate = {
  id: "candidate-1",
  name: "Care Bears",
  description: "A candidate description.",
  imageUrl: "",
  tags: ["classic"]
};

function renderManager(overrides = {}) {
  const actions = {
    onCreate: vi.fn(),
    onImport: vi.fn(),
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    ...overrides.actions
  };
  const editor = {
    isOpen: false,
    isEditing: false,
    draft: { name: "", description: "", imageUrl: "", tagsText: "" },
    imageSuggestions: [],
    imageSuggestionLoading: false,
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    onSuggestImages: vi.fn(),
    onClearImage: vi.fn(),
    onSelectSuggestedImage: vi.fn(),
    ...overrides.editor
  };
  const view = { readOnly: false, showTopRule: false, ...overrides.view };
  const tagManagement = { showControl: true, ...overrides.tagManagement };

  const result = render(
    <CandidateManagerPanel
      collection={{ candidates: [candidate], hasNextPage: false, isLoadingMore: false, loadMore: vi.fn() }}
      editor={editor}
      actions={actions}
      tagManagement={tagManagement}
      view={view}
    />
  );

  return { ...result, actions, editor };
}

describe("CandidateManagerPanel", () => {
  it("keeps a blank candidate from submitting and focuses its name field", async () => {
    const user = userEvent.setup();
    const { editor } = renderManager({ editor: { isOpen: true } });
    const nameInput = screen.getByLabelText("Candidate name");

    expect(document.activeElement).toBe(nameInput);
    await user.click(screen.getByRole("button", { name: "Create Candidate" }));

    expect(screen.getByRole("alert").textContent).toContain("Enter a candidate name before saving.");
    expect(document.activeElement).toBe(nameInput);
    expect(editor.onSubmit).not.toHaveBeenCalled();
  });

  it("expands read-only candidates without exposing mutation controls", async () => {
    const user = userEvent.setup();
    const { actions, container } = renderManager({ view: { readOnly: true } });

    const candidateButton = screen.getByRole("button", { name: /Care Bears/ });
    await user.click(candidateButton);

    expect(actions.onEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Add candidate" })).toBeNull();
    expect(candidateButton.parentElement?.className).toContain("expanded");
  });

  it("keeps tags viewable but hides destructive controls in read-only mode", async () => {
    const user = userEvent.setup();
    renderManager({ view: { readOnly: true } });

    await user.click(screen.getByRole("button", { name: "View Tags" }));

    expect(screen.getByRole("dialog", { name: "Pool Tags" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "All Tags" })).not.toBeNull();
    expect(screen.queryByText("Delete Tag")).toBeNull();
  });
});
