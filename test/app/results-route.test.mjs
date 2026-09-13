// @vitest-environment node

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

let scenario;

function aggregateResults() {
  return {
    tournament: { id: "parallel-1", title: "Rankings" },
    aggregateEntries: [],
    participants: [],
    completedBallotCount: 0,
    canInspectAllParticipants: false,
  };
}

describe("results route", () => {
  beforeEach(() => {
    vi.resetModules();
    scenario = {
      user: null,
      anonymousVoterToken: "anon-1",
      standardError: new Error("NOT_FOUND"),
      parallelResults: aggregateResults(),
      parallelError: null,
      calls: [],
      notFound: vi.fn(() => {
        throw new Error("not-found");
      }),
    };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("next/navigation", () => ({ notFound: scenario.notFound }));
    vi.doMock("next/headers", () => ({
      cookies: vi.fn(async () => ({
        get: vi.fn(() => ({ value: scenario.anonymousVoterToken })),
      })),
    }));
    vi.doMock("@/lib/auth/current-user", () => ({
      getOptionalCurrentUser: vi.fn(async () => scenario.user),
    }));
    vi.doMock("@/lib/auth/viewer", () => ({ ANONYMOUS_VOTER_COOKIE: "anon-voter" }));
    vi.doMock("@/components/brackets", () => ({
      BracketOutcomeNav: vi.fn(() => null),
      BracketProgressPage: vi.fn(() => null),
      ParallelResultsPage: vi.fn(() => null),
      ResultsLinkedViewSelect: vi.fn(() => null),
      TournamentScoringPage: vi.fn(() => null),
      TournamentResultsPage: vi.fn(() => null),
      supportsRoundProgressView: vi.fn(() => false),
    }));
    vi.doMock("@/lib/brackets", () => ({
      bracket: vi.fn(() => ({
        listMatches: vi.fn(async () => ({ matches: [] })),
        listRounds: vi.fn(async () => []),
        listVoterScores: vi.fn(async () => ({
          scores: [],
          voteHistoryByVoterKey: {},
          canInspectAllScores: false,
          scoringEnabled: false,
        })),
      })),
      bracketDirectory: vi.fn(() => ({
        getAccessibleBracketById: vi.fn(async (options) => {
          scenario.calls.push(["standard", options]);
          throw scenario.standardError;
        }),
      })),
      parallelBracketDirectory: vi.fn(() => ({
        getAggregateResults: vi.fn(async (options) => {
          scenario.calls.push(["parallel", options]);
          if (scenario.parallelError) throw scenario.parallelError;
          return scenario.parallelResults;
        }),
      })),
    }));
  });

  it("falls back to parallel results without warning", async () => {
    const { default: ResultsRoute } = await import("../../app/results/[bracketId]/page.js");

    await ResultsRoute({
      params: Promise.resolve({ bracketId: "parallel-1" }),
      searchParams: Promise.resolve({}),
    });

    assert.deepEqual(scenario.calls.map(([name]) => name), ["standard", "parallel"]);
    assert.equal(console.warn.mock.calls.length, 0);
    assert.equal(scenario.notFound.mock.calls.length, 0);
  });

  it("throws non-missing parallel lookup errors", async () => {
    scenario.parallelError = new Error("FORBIDDEN");
    const { default: ResultsRoute } = await import("../../app/results/[bracketId]/page.js");

    await assert.rejects(
      () => ResultsRoute({
        params: Promise.resolve({ bracketId: "parallel-1" }),
        searchParams: Promise.resolve({}),
      }),
      /FORBIDDEN/,
    );

    assert.equal(scenario.notFound.mock.calls.length, 0);
  });
});
