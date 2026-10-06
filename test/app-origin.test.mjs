import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePreferredOrigin } from "../lib/app-origin.js";

describe("app origin resolution", () => {
  it("uses the Brackeroni request host instead of a configured Vercel origin", () => {
    assert.equal(
      resolvePreferredOrigin({
        configuredOrigin: "https://brackeroni-git-main-example.vercel.app",
        forwardedProto: "https",
        forwardedHost: "www.brackeroni.com",
        host: "brackeroni-git-main-example.vercel.app",
      }),
      "https://www.brackeroni.com",
    );
  });

  it("keeps localhost configured origins for local requests", () => {
    assert.equal(
      resolvePreferredOrigin({
        configuredOrigin: "http://localhost:3000",
        forwardedProto: "http",
        forwardedHost: "localhost:3000",
        host: "localhost:3000",
      }),
      "http://localhost:3000",
    );
  });
});
