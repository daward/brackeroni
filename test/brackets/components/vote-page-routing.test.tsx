// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const bracketId = "11111111-1111-4111-8111-111111111111";

let scenario: {
  redirect: ReturnType<typeof vi.fn>;
  user: { id: string } | null;
  anonymousVoterToken: string | null;
  bracket: ReturnType<typeof activeBracket>;
  parallelBracket: ReturnType<typeof activeBracket> & {
    viewerBracketId?: string | null;
    viewerParticipantStatus?: string | null;
  };
  publicBrackets: ReturnType<typeof activeBracket>[];
  votedBrackets: ReturnType<typeof activeBracket>[];
  calls: Array<[string, unknown?]>;
};

function activeBracket(overrides = {}) {
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
    ...overrides,
  };
}

describe("vote page routing", () => {
  beforeEach(() => {
    vi.resetModules();
    scenario = {
      redirect: vi.fn((href: string) => {
        throw new Error(`redirect:${href}`);
      }),
      user: { id: "user-1" },
      anonymousVoterToken: null,
      bracket: activeBracket(),
      parallelBracket: activeBracket({
        id: "parallel-1",
        visibility: "public_unlisted",
        votingAccess: "anyone",
      }),
      publicBrackets: [],
      votedBrackets: [],
      calls: [],
    };

    vi.doMock("next/navigation", () => ({ redirect: scenario.redirect }));
    vi.doMock("next/headers", () => ({
      cookies: vi.fn(async () => ({
        get: vi.fn(() => scenario.anonymousVoterToken ? { value: scenario.anonymousVoterToken } : null),
      })),
    }));
    vi.doMock("@/lib/auth/current-user", () => ({ getOptionalCurrentUser: vi.fn(async () => scenario.user) }));
    vi.doMock("@/lib/auth/viewer", () => ({ ANONYMOUS_VOTER_COOKIE: "anon-voter" }));
    vi.doMock("@/lib/brackets", () => ({
      bracket: vi.fn(() => ({
        listMatches: vi.fn(async () => ({
          matches: [{ id: "match-1", status: "open", userVoteEntryId: "entry-1" }],
        })),
      })),
      bracketDirectory: vi.fn(() => ({
        getAccessibleBracketById: vi.fn(async () => scenario.bracket),
        listAccessibleBrackets: vi.fn(async () => [scenario.bracket]),
        listPublicBrackets: vi.fn(async () => scenario.publicBrackets),
        listVotedBrackets: vi.fn(async (options) => {
          scenario.calls.push(["listVotedBrackets", options]);
          return scenario.votedBrackets;
        }),
      })),
      parallelBracketDirectory: vi.fn(() => ({
        getAccessibleBracketById: vi.fn(async (options) => {
          scenario.calls.push(["getAccessibleParallelBracketById", options]);
          return scenario.parallelBracket;
        }),
        listAccessibleBrackets: vi.fn(async () => []),
        listPublicBrackets: vi.fn(async () => []),
        openParticipantBracket: vi.fn(async (options) => {
          scenario.calls.push(["openParticipantBracket", options]);
          return { bracketId: "participant-1" };
        }),
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

  it("keeps anonymous public active brackets on the vote page after the guest has voted", async () => {
    scenario.user = null;
    scenario.anonymousVoterToken = "anon-1";
    scenario.bracket = activeBracket({
      visibility: "public_unlisted",
      votingAccess: "anyone",
    });
    const { default: BracketVotingPage } = await import("../../../components/brackets/voting/internal/vote-page");

    await BracketVotingPage({ searchParams: Promise.resolve({ bracket: bracketId }) });

    expect(scenario.redirect).not.toHaveBeenCalled();
  });

  it("includes anonymous voted public unlisted brackets in the vote list", async () => {
    scenario.user = null;
    scenario.anonymousVoterToken = "anon-1";
    scenario.bracket = activeBracket({
      visibility: "public_unlisted",
      votingAccess: "anyone",
    });
    scenario.votedBrackets = [scenario.bracket];
    const { default: BracketVotingPage } = await import("../../../components/brackets/voting/internal/vote-page");

    const page = await BracketVotingPage({ searchParams: Promise.resolve({}) });
    const panels = page.props.children;

    expect(scenario.calls[0]).toEqual([
      "listVotedBrackets",
      {
        userId: null,
        anonymousVoterToken: "anon-1",
        statuses: ["active"],
        limit: 12,
        offset: 0,
      },
    ]);
    expect(panels.props.activeTournaments.map((tournament: { id: string }) => tournament.id)).toContain(bracketId);
  });

  it("sends completed anonymous synchronized voters to their own ballot results", async () => {
    scenario.user = null;
    scenario.anonymousVoterToken = "anon-1";
    scenario.parallelBracket = activeBracket({
      id: "parallel-1",
      visibility: "public_unlisted",
      votingAccess: "anyone",
      viewerBracketId: "participant-1",
      viewerParticipantStatus: "complete",
    });
    const { default: BracketVotingPage } = await import("../../../components/brackets/voting/internal/vote-page");

    await expect(
      BracketVotingPage({ searchParams: Promise.resolve({ parallelBracket: "parallel-1" }) }),
    ).rejects.toThrow("redirect:/results/participant-1");
    expect(scenario.redirect).toHaveBeenCalledWith("/results/participant-1");
  });
});
