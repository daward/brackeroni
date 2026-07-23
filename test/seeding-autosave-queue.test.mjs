import test from "node:test";
import assert from "node:assert/strict";

function pickNextQueuedSave(currentJob, queuedJob) {
  if (!queuedJob) {
    return null;
  }

  if (queuedJob.snapshot === currentJob.snapshot) {
    return null;
  }

  return queuedJob;
}

test("queued save with newer snapshot should run after current job", () => {
  const currentJob = { snapshot: "a" };
  const queuedJob = { snapshot: "b" };

  const next = pickNextQueuedSave(currentJob, queuedJob);

  assert.deepEqual(next, queuedJob);
});

test("queued save with identical snapshot should be discarded", () => {
  const currentJob = { snapshot: "a" };
  const queuedJob = { snapshot: "a" };

  const next = pickNextQueuedSave(currentJob, queuedJob);

  assert.equal(next, null);
});

test("missing queued save should keep queue empty", () => {
  const currentJob = { snapshot: "a" };

  const next = pickNextQueuedSave(currentJob, null);

  assert.equal(next, null);
});
