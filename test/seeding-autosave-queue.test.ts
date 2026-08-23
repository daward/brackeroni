import { expect, it } from "vitest";
const pickNextQueuedSave = <T extends { snapshot: string }>(current: T, queued: T | null) => !queued || queued.snapshot === current.snapshot ? null : queued;
it("runs only a newer queued save", () => { expect(pickNextQueuedSave({ snapshot: "a" }, { snapshot: "b" })).toEqual({ snapshot: "b" }); expect(pickNextQueuedSave({ snapshot: "a" }, { snapshot: "a" })).toBeNull(); });
