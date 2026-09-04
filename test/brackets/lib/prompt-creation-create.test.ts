import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

let createCalls: Array<Record<string, unknown>>;

describe("prompt bracket creation persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    createCalls = [];
    delete process.env.GEMINI_API_KEY;

    vi.doMock("@/lib/pools", () => ({
      listPools: vi.fn(async () => ({ items: [] })),
      listPublicPools: vi.fn(async () => []),
      createPool: vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
    }));
    vi.doMock("@/lib/gemini/generate-candidates", () => ({
      generateCandidatesWithGemini: vi.fn(async () => ({ candidates: [{ name: "Pizza" }, { name: "Sushi" }] })),
    }));
    vi.doMock("@/lib/brackets", () => ({
      brackets: vi.fn(() => ({ create: vi.fn() })),
      parallelBrackets: vi.fn(() => ({
        create: vi.fn(async (payload) => {
          createCalls.push(payload);
          return { id: "22222222-2222-4222-8222-222222222222", status: "draft", ...payload };
        }),
      })),
    }));
  });

  it("creates family consensus prompts as friends parallel drafts", async () => {
    const { createBracketFromPrompt } = await import("@/lib/brackets/internal/prompt-creation");

    const result = await createBracketFromPrompt({
      creatorUserId: "user-1",
      prompt: "I want to quickly pick the best option for dinner that my family agrees on",
    });

    assert.equal(result.plan.sharingMode, "with_friends");
    assert.equal(result.plan.resultMode, "parallel_full_ranking");
    assert.equal(createCalls[0].sharingMode, "with_friends");
    assert.equal(createCalls[0].visibility, "private");
  });
});
