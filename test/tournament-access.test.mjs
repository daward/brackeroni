import assert from "node:assert/strict";
import test from "node:test";

import { assertTournamentAccess } from "../lib/services/tournament-access.js";

function createSql(responses = []) {
  const calls = [];
  const sql = async (strings) => {
    calls.push(strings.join(" ").replace(/\s+/g, " ").trim());
    return responses.shift() ?? [];
  };

  return { calls, sql };
}

test("standard bracket access skips parallel-participant database checks", async () => {
  const { calls, sql } = createSql();

  await assertTournamentAccess({
    sql,
    tournamentId: "standard-bracket",
    sharingMode: "private",
    visibility: "public_listed",
    votingAccess: null,
    creatorUserId: "creator",
    userId: "voter",
    isParallelParticipantTournament: false,
    mode: "vote",
  });

  assert.deepEqual(calls, []);
});

test("parallel child access still checks its participant record", async () => {
  const { calls, sql } = createSql([
    [{ hasParallelTournamentParticipantTable: true }],
    [{ present: 1 }],
  ]);

  await assertTournamentAccess({
    sql,
    tournamentId: "parallel-child",
    sharingMode: "private",
    visibility: "private",
    votingAccess: null,
    creatorUserId: "creator",
    userId: "participant",
    isParallelParticipantTournament: true,
    mode: "vote",
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0], /information_schema\.tables/);
  assert.match(calls[1], /parallel_tournament_participant/);
});
