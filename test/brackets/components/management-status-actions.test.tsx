import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CloseVotingButton, StatusActionRow } from "@/components/brackets/management";

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
});
