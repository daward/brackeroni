// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const bracketId = "11111111-1111-4111-8111-111111111111";

let scenario: {
  redirect: ReturnType<typeof vi.fn>;
};

function activeBracket() {
  return {
    id: bracketId,
    title: "Creator Bracket",
    status: "active",
    creatorUserId: "user-1",
    visibility: "private",
    sharingMode: "private",
    votingAccess: "signed_in_only",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("vote page routing", () => {
  beforeEach(() => {
    vi.resetModules();
    scenario = {
      redirect: vi.fn((href: string) => {
        throw new Error(`redirect:${href}`);
      }),
    };

    vi.doMock("next/navigation", () => ({ redirect: scenario.redirect }));
    vi.doMock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => null) })) }));
    vi.doMock("@/lib/auth/current-user", () => ({ getOptionalCurrentUser: vi.fn(async () => ({ id: "user-1" })) }));
    vi.doMock("@/lib/auth/viewer", () => ({ ANONYMOUS_VOTER_COOKIE: "anon-voter" }));
    vi.doMock("@/lib/brackets", () => ({
      bracket: vi.fn(() => ({
        listMatches: vi.fn(async () => ({
          matches: [{ id: "match-1", status: "open", userVoteEntryId: "entry-1" }],
        })),
      })),
      bracketDirectory: vi.fn(() => ({
        getAccessibleBracketById: vi.fn(async () => activeBracket()),
        listAccessibleBrackets: vi.fn(async () => [activeBracket()]),
        listPublicBrackets: vi.fn(async () => []),
      })),
      parallelBracketDirectory: vi.fn(() => ({
        listAccessibleBrackets: vi.fn(async () => []),
        listPublicBrackets: vi.fn(async () => []),
      })),
    }));
  });

  it("returns creator flows with no remaining votes to bracket management", async () => {
    const { default: BracketVotingPage } = await import("../../../components/brackets/voting/internal/vote-page");

    await expect(
      BracketVotingPage({ searchParams: Promise.resolve({ bracket: bracketId, returnTo: "create" }) }),
    ).rejects.toThrow("redirect:/brackets?stage=active");
    expect(scenario.redirect).toHaveBeenCalledWith("/brackets?stage=active");
  });
});
