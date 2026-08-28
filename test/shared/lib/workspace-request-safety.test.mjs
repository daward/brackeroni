import { test } from "vitest";
import assert from "node:assert/strict";
import { runSingleFlight } from "../../../lib/async/single-flight.js";
import { normalizePoolNavigationTarget } from "../../../components/pools/shared";
import { createWorkspaceRequestLoopGuard } from "../../../lib/client-api/workspace-request-loop-guard.js";
import { takeRequestRateLimit } from "../../../lib/api/request-rate-limit.js";

test("pool navigation only accepts a pool UUID or null", () => {
  const poolId = "d419587c-10ea-46d7-8c04-1879d64dbe96";

  assert.equal(normalizePoolNavigationTarget(poolId), poolId);
  assert.equal(normalizePoolNavigationTarget(null), null);
  assert.equal(normalizePoolNavigationTarget(() => null), undefined);
  assert.equal(normalizePoolNavigationTarget("(current) => current"), undefined);
});

test("workspace request guard blocks a repeated list endpoint", () => {
  let time = 0;
  const guard = createWorkspaceRequestLoopGuard({
    limit: 2,
    windowMs: 1000,
    now: () => time
  });

  assert.equal(guard.record("/api/pools"), null);
  time += 100;
  assert.equal(guard.record("/api/pools"), null);
  time += 100;
  assert.deepEqual(guard.record("/api/pools"), {
    path: "/api/pools",
    count: 3,
    windowMs: 1000,
    limit: 2
  });
});

test("workspace request guard does not block unrelated requests", () => {
  const guard = createWorkspaceRequestLoopGuard({ limit: 1 });

  assert.equal(guard.record("/api/pools", "POST"), null);
  assert.equal(guard.record("/api/image-suggestions"), null);
});

test("single-flight workspace loads share one pending request", async () => {
  const pendingRequestRef = { current: null };
  let calls = 0;
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const createRequest = () => {
    calls += 1;
    return pending;
  };

  const first = runSingleFlight(pendingRequestRef, createRequest);
  const second = runSingleFlight(pendingRequestRef, createRequest);

  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);

  release("done");
  await first;
  await Promise.resolve();

  assert.equal(pendingRequestRef.current, null);
});
test("workspace API limiter rejects an excessive refresh burst", () => {
  let time = 0;
  const options = {
    key: `test-workspace-list-${Math.random()}`,
    limit: 2,
    windowMs: 1000,
    now: () => time
  };

  assert.equal(takeRequestRateLimit(options).allowed, true);
  time += 100;
  assert.equal(takeRequestRateLimit(options).allowed, true);
  time += 100;
  const blocked = takeRequestRateLimit(options);

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
});
