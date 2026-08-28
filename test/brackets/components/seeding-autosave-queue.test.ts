import { describe, expect, it } from "vitest";

describe("seeding autosave queue", () => {
  function pickNextQueuedSave<T extends { snapshot: string }>(current: T, queued: T | null) {
    return !queued || queued.snapshot === current.snapshot ? null : queued;
  }

  it("runs a queued save when it has a newer snapshot", () => {
    expect(pickNextQueuedSave({ snapshot: "a" }, { snapshot: "b" })).toEqual({ snapshot: "b" });
  });

  it("skips a queued save when it matches the current snapshot", () => {
    expect(pickNextQueuedSave({ snapshot: "a" }, { snapshot: "a" })).toBeNull();
  });
});
