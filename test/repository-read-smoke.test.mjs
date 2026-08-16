import assert from "node:assert/strict";
import test from "node:test";
const databaseUrl = process.env.DATABASE_URL || null;

test("public repository reads execute against the configured database", {
  skip: !databaseUrl && "DATABASE_URL is not configured"
}, async (t) => {
  process.env.DATABASE_URL = databaseUrl;

  const { getPoolById } = await import("../lib/data/pool-access.js");
  const { listPublicPools } = await import("../lib/data/pool-listing.js");
  const { getAccessibleTournamentById } = await import("../lib/data/tournament-access.js");
  const { listPublicTournaments } = await import("../lib/data/tournament-listing.js");

  const publicPools = await listPublicPools({ limit: 1 });
  const pool = publicPools[0];

  if (pool) {
    const detail = await getPoolById({ poolId: pool.id, userId: null });
    assert.equal(detail.id, pool.id);
    assert.ok(Array.isArray(detail.candidates));
  } else {
    t.diagnostic("No public pools available; pool detail smoke check skipped.");
  }

  const publicTournaments = await listPublicTournaments({ limit: 1 });
  const tournament = publicTournaments[0];

  if (tournament) {
    const detail = await getAccessibleTournamentById({
      tournamentId: tournament.id,
      userId: null
    });
    assert.equal(detail.id, tournament.id);
    assert.ok(Array.isArray(detail.entries));
  } else {
    t.diagnostic("No public tournaments available; tournament detail smoke check skipped.");
  }
});
