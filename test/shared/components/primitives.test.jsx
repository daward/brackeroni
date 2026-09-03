import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(
      screen.getByRole("img", { name: "Candidate" }).classList.contains("image-rail-card-image")
    ).toBe(true);
    expect(card.querySelector(".image-rail-card-rail")?.classList.contains("candidate-rail")).toBe(true);
  });

  it("normalizes protocol-relative rail images and retries them through the proxy", () => {
    render(
      <ImageRailCard imageUrl="//yt3.googleusercontent.com/avatar=s176-c" imageAlt="3Blue1Brown">
        3Blue1Brown
      </ImageRailCard>
    );

    const image = screen.getByRole("img", { name: "3Blue1Brown" });
    expect(image.getAttribute("src")).toBe("https://yt3.googleusercontent.com/avatar=s176-c");

    fireEvent.error(image);

    expect(image.getAttribute("src")).toBe(
      "/api/image-proxy?url=https%3A%2F%2Fyt3.googleusercontent.com%2Favatar%3Ds176-c"
    );
  });

  it("does not render an image element without a usable source", () => {
    const { container } = render(<ResilientRemoteImage src="" alt="Unused" />);

    expect(container.childElementCount).toBe(0);
  });

  it("does not render an empty image source while a new source is settling", () => {
    const { rerender } = render(<ResilientRemoteImage src="" alt="Candidate" />);

    rerender(<ResilientRemoteImage src="https://images.example.test/candidate.jpg" alt="Candidate" />);

    expect(screen.getByRole("img", { name: "Candidate" }).getAttribute("src")).toBe(
      "https://images.example.test/candidate.jpg"
    );
  });

  it("applies resilient image defaults without requiring error callbacks", () => {
    render(<ResilientRemoteImage src="https://images.example.test/candidate.jpg" alt="Candidate" />);

    const image = screen.getByRole("img", { name: "Candidate" });
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("decoding")).toBe("async");
    expect(image.getAttribute("referrerpolicy")).toBe("no-referrer");
  });
});
