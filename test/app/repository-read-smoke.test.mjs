import assert from "node:assert/strict";
import { test } from "vitest";
const databaseUrl = process.env.DATABASE_URL || null;

test.skipIf(!databaseUrl)("public repository reads execute against the configured database", async () => {
  process.env.DATABASE_URL = databaseUrl;

  const { listPublicPools, pool: poolHandle } = await import("../../lib/pools/index");
  const { bracketDirectory } = await import("@/lib/brackets");
  const directory = bracketDirectory();

  const publicPools = await listPublicPools({ limit: 1 });
  const pool = publicPools[0];

  if (pool) {
    const detail = await poolHandle({ poolId: pool.id, viewerUserId: null }).get();
    assert.equal(detail.id, pool.id);
    assert.ok(Array.isArray(detail.candidates));
  } else {
    console.info("No public pools available; pool detail smoke check skipped.");
  }

  const publicTournaments = await directory.listPublicTournaments({ limit: 1 });
  const tournament = publicTournaments[0];

  if (tournament) {
    const detail = await directory.getAccessibleTournamentById({
      tournamentId: tournament.id,
      userId: null
    });
    assert.equal(detail.id, tournament.id);
    assert.ok(Array.isArray(detail.entries));
  } else {
    console.info("No public tournaments available; tournament detail smoke check skipped.");
  }
});
