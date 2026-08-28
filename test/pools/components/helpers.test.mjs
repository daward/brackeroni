import assert from "node:assert/strict";
import { test } from "vitest";

import {
  describePoolVisibility,
  isGeneratedPoolSourceDescription,
  normalizePoolNavigationTarget,
  sortManagedPools,
} from "../../../components/pools/shared";

test("managed pools sort owned pools first and newest pools before older pools", () => {
  const sorted = sortManagedPools([
    { id: "public-old", name: "Zeta", isOwned: false, updatedAt: "2026-01-03" },
    { id: "owned-old", name: "Bravo", isOwned: true, updatedAt: "2026-01-01" },
    { id: "owned-new", name: "Alpha", isOwned: true, updatedAt: "2026-01-05" },
    { id: "public-new", name: "Alpha", isOwned: false, updatedAt: "2026-01-04" }
  ]);

  assert.deepEqual(sorted.map((pool) => pool.id), ["owned-new", "owned-old", "public-new", "public-old"]);
});

test("managed pool sorting falls back to created time and then name", () => {
  const sorted = sortManagedPools([
    { id: "b", name: "Bravo", isOwned: true, createdAt: "2026-01-01" },
    { id: "c", name: "Charlie", isOwned: true, createdAt: "2026-01-02" },
    { id: "a", name: "Alpha", isOwned: true, createdAt: "2026-01-01" }
  ]);

  assert.deepEqual(sorted.map((pool) => pool.id), ["c", "a", "b"]);
});

test("pool presentation helpers describe imports and sharing states", () => {
  assert.equal(describePoolVisibility("public_listed"), "Published");
  assert.equal(describePoolVisibility("public_unlisted"), "Published Unlisted");
  assert.equal(describePoolVisibility("private"), "Private Draft");
  assert.equal(describePoolVisibility("unknown"), "Private Draft");

  assert.equal(
    isGeneratedPoolSourceDescription("Imported from example.com", "https://example.com/list"),
    true
  );
  assert.equal(
    isGeneratedPoolSourceDescription("Imported from other.example", "https://example.com/list"),
    false
  );
  assert.equal(isGeneratedPoolSourceDescription("Imported from example.com", "not a url"), false);
});

test("pool workspace navigation only accepts ids and explicit null", () => {
  const poolId = "12345678-1234-1234-1234-123456789abc";

  assert.equal(normalizePoolNavigationTarget(poolId), poolId);
  assert.equal(normalizePoolNavigationTarget(null), null);
  assert.equal(normalizePoolNavigationTarget(() => null), undefined);
  assert.equal(normalizePoolNavigationTarget("(current) => current"), undefined);
});
