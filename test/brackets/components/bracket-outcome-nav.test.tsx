import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BracketOutcomeNav } from "@/components/brackets";

describe("bracket outcome navigation", () => {
  it("builds scoring links from the bracket id", () => {
    render(<BracketOutcomeNav bracketId="bracket-1" showResults showRounds showScoring />);

    expect(screen.getByRole("link", { name: "Results" }).getAttribute("href")).toBe("/results/bracket-1");
    expect(screen.getByRole("link", { name: "Scoring" }).getAttribute("href")).toBe("/results/bracket-1?view=scoring");
  });
});
