import assert from "node:assert/strict";
import { test } from "vitest";

import {
  archiveParallelTournament,
  archivePool,
  closeCurrentTournamentRound,
  createCandidateInPool,
  createParallelTournament,
  createPool,
  createTournament,
  ensureParallelTournamentShareLink,
  ensureTournamentShareLink,
  getPool,
  listParallelTournaments,
  listPools,
  listTournaments,
  mergePoolIntoPool,
  openNextTournamentRound,
  removeCandidateFromPool,
  rerunTournament,
  revealTournamentRound,
  setTournamentMatchWinner,
  startParallelTournament,
  startTournament,
  suggestImages,
  syncTournamentWithPool,
  updateCandidateInPool,
  updateParallelTournament,
  updatePool,
  updateTournament,
  updateTournamentEntries
} from "../../lib/client-api/create-workspace.js";

function installFetchSpy() {
  const calls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (path, options = {}) => {
    calls.push({
      path,
      options,
      body: options.body ? JSON.parse(options.body) : undefined
    });

    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true };
      }
    };
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    }
  };
}

async function expectRequest(action, expected) {
  const fetchSpy = installFetchSpy();

  try {
    await action();
  } finally {
    fetchSpy.restore();
  }

  assert.equal(fetchSpy.calls.length, 1);
  const [call] = fetchSpy.calls;
  assert.equal(call.path, expected.path);
  assert.equal(call.options.method || "GET", expected.method || "GET");
  assert.equal(call.options.cache, expected.cache);
  assert.deepEqual(call.body, expected.body);
}

test("workspace client maps pool requests to API endpoints", async () => {
  await expectRequest(() => listPools({ limit: 12, offset: 24 }), {
    path: "/api/pools?limit=12&offset=24",
    cache: "no-store"
  });
  await expectRequest(() => getPool("pool-1", { candidateLimit: 10, candidateOffset: 20 }), {
    path: "/api/pools/pool-1?candidateLimit=10&candidateOffset=20",
    cache: "no-store"
  });
  await expectRequest(() => createPool({ name: "Favorites" }), {
    path: "/api/pools",
    method: "POST",
    body: { name: "Favorites" }
  });
  await expectRequest(() => updatePool("pool-1", { name: "Updated" }), {
    path: "/api/pools/pool-1",
    method: "PATCH",
    body: { name: "Updated" }
  });
  await expectRequest(() => archivePool("pool-1"), {
    path: "/api/pools/pool-1",
    method: "DELETE"
  });
  await expectRequest(() => mergePoolIntoPool("pool-1", "source-1"), {
    path: "/api/pools/pool-1/imports",
    method: "POST",
    body: { sourcePoolId: "source-1" }
  });
  await expectRequest(() => createCandidateInPool("pool-1", { name: "Ada" }), {
    path: "/api/pools/pool-1/candidates",
    method: "POST",
    body: { name: "Ada" }
  });
  await expectRequest(() => updateCandidateInPool("pool-1", "candidate-1", { name: "Grace" }), {
    path: "/api/pools/pool-1/candidates/candidate-1",
    method: "PATCH",
    body: { name: "Grace" }
  });
  await expectRequest(() => removeCandidateFromPool("pool-1", "candidate-1"), {
    path: "/api/pools/pool-1/candidates/candidate-1",
    method: "DELETE"
  });
});

test("workspace client maps tournament requests and lifecycle helpers", async () => {
  await expectRequest(() => listTournaments({ limit: 10, offset: 5, status: "active" }), {
    path: "/api/brackets?limit=10&offset=5&status=active",
    cache: "no-store"
  });
  await expectRequest(() => createTournament({ title: "Best" }), {
    path: "/api/brackets",
    method: "POST",
    body: { title: "Best" }
  });
  await expectRequest(() => updateTournament("tournament-1", { title: "Updated" }), {
    path: "/api/brackets/tournament-1",
    method: "PATCH",
    body: { title: "Updated" }
  });
  await expectRequest(() => startTournament("tournament-1"), {
    path: "/api/brackets/tournament-1",
    method: "PATCH",
    body: { status: "active" }
  });
  await expectRequest(() => syncTournamentWithPool("tournament-1"), {
    path: "/api/brackets/tournament-1",
    method: "PATCH",
    body: { syncWithPool: true }
  });
  await expectRequest(() => closeCurrentTournamentRound("tournament-1"), {
    path: "/api/brackets/tournament-1",
    method: "PATCH",
    body: { closeCurrentRound: true }
  });
  await expectRequest(() => openNextTournamentRound("tournament-1"), {
    path: "/api/brackets/tournament-1",
    method: "PATCH",
    body: { openNextRound: true }
  });
  await expectRequest(() => rerunTournament("tournament-1"), {
    path: "/api/brackets/tournament-1/rerun-drafts",
    method: "POST"
  });
  await expectRequest(() => ensureTournamentShareLink("tournament-1", { rotate: true }), {
    path: "/api/brackets/tournament-1/links",
    method: "POST",
    body: { rotate: true }
  });
  await expectRequest(() => revealTournamentRound("round-1"), {
    path: "/api/rounds/round-1",
    method: "PATCH",
    body: { revealed: true }
  });
  await expectRequest(() => updateTournamentEntries("tournament-1", [{ id: "entry-1", seed: 1 }], { subBrackets: [] }), {
    path: "/api/brackets/tournament-1/entries",
    method: "PATCH",
    body: { entries: [{ id: "entry-1", seed: 1 }], seedingStructure: { subBrackets: [] } }
  });
  await expectRequest(() => setTournamentMatchWinner("match-1", "entry-1"), {
    path: "/api/matches/match-1",
    method: "PATCH",
    body: { winnerEntryId: "entry-1" }
  });
});

test("workspace client maps parallel bracket and image suggestion requests", async () => {
  await expectRequest(() => listParallelTournaments({ limit: 8, offset: 16, status: "complete" }), {
    path: "/api/parallel-brackets?limit=8&offset=16&status=complete",
    cache: "no-store"
  });
  await expectRequest(() => createParallelTournament({ title: "Team vote" }), {
    path: "/api/parallel-brackets",
    method: "POST",
    body: { title: "Team vote" }
  });
  await expectRequest(() => updateParallelTournament("parallel-1", { title: "Updated" }), {
    path: "/api/parallel-brackets/parallel-1",
    method: "PATCH",
    body: { title: "Updated" }
  });
  await expectRequest(() => startParallelTournament("parallel-1"), {
    path: "/api/parallel-brackets/parallel-1",
    method: "PATCH",
    body: { status: "active" }
  });
  await expectRequest(() => archiveParallelTournament("parallel-1"), {
    path: "/api/parallel-brackets/parallel-1",
    method: "DELETE"
  });
  await expectRequest(() => ensureParallelTournamentShareLink("parallel-1"), {
    path: "/api/parallel-brackets/parallel-1/links",
    method: "POST",
    body: {}
  });
  await expectRequest(() => suggestImages("Ada Lovelace & math"), {
    path: "/api/image-suggestions?q=Ada%20Lovelace%20%26%20math",
    cache: "no-store"
  });
});
