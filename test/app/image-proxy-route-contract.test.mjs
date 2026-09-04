// @vitest-environment node

import assert from "node:assert/strict";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { responseJson, routeRequest } from "./api-contract-harness.mjs";

describe("image proxy route contract", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  it("requires a signed-in user before fetching an upstream image", async () => {
    vi.doMock("@/lib/auth/current-user", () => ({
      getCurrentUser: vi.fn(async () => {
        throw new Error("UNAUTHORIZED");
      })
    }));
    const { GET } = await import("../../app/api/image-proxy/route.js");

    const response = await GET(routeRequest("/api/image-proxy?url=https%3A%2F%2Fimages.example.test%2Fphoto.jpg"));
    const payload = await responseJson(response);

    assert.equal(response.status, 401);
    assert.equal(payload.error.code, "UNAUTHORIZED");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
