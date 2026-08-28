import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageRailCard, ResilientRemoteImage } from "@/components/shared";

describe("shared presentation primitives", () => {
  it("keeps image-card mechanics in the shared rail primitive", () => {
    render(
      <ImageRailCard
        as="button"
        type="button"
        imageUrl="https://images.example.test/candidate.jpg"
        imageAlt="Candidate"
        railClassName="candidate-rail"
      >
        Candidate name
      </ImageRailCard>
    );

    const card = screen.getByRole("button", { name: /candidate name/i });
    expect(card.classList.contains("image-rail-card")).toBe(true);
    expect(screen.getByRole("img", { name: "Candidate" }).classList.contains("image-rail-card-image")).toBe(true);
    expect(card.querySelector(".image-rail-card-rail")?.classList.contains("candidate-rail")).toBe(true);
  });

  it("does not render an image element without a usable source", () => {
    const { container } = render(<ResilientRemoteImage src="" alt="Unused" />);

    expect(container.childElementCount).toBe(0);
  });

  it("applies resilient image defaults without requiring error callbacks", () => {
    render(<ResilientRemoteImage src="https://images.example.test/candidate.jpg" alt="Candidate" />);

    const image = screen.getByRole("img", { name: "Candidate" });
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("decoding")).toBe("async");
    expect(image.getAttribute("referrerpolicy")).toBe("no-referrer");
  });
});
