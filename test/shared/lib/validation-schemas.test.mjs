import assert from "node:assert/strict";
import { test } from "vitest";

import { adminPoolUpdateSchema, adminVisibilityUpdateSchema } from "../../../lib/validation/admin.js";
import { bracketTemplateCreateSchema, bracketTemplateUpdateSchema } from "../../../lib/validation/bracket-template.js";
import { candidateCreateSchema, candidateUpdateSchema } from "../../../lib/validation/candidate.js";
import { matchWinnerUpdateSchema } from "../../../lib/validation/match.js";
import { parallelTournamentCreateSchema, parallelTournamentUpdateSchema } from "../../../lib/validation/parallel-tournament.js";
import {
  compactHtmlForImport,
  poolCandidateAttachSchema,
  poolCandidateCreateSchema,
  poolCreateSchema,
  poolImportSchema,
  poolSourceEnrichmentSchema,
  poolTagManagementSchema,
  poolTagThresholdCleanupSchema,
  poolUpdateSchema
} from "../../../lib/validation/pool.js";
import { tournamentCreateSchema, tournamentUpdateSchema } from "../../../lib/validation/tournament.js";
import { voteCreateSchema } from "../../../lib/validation/vote.js";

const UUID = "d419587c-10ea-46d7-8c04-1879d64dbe96";

function assertParses(schema, input, expected = undefined) {
  const result = schema.safeParse(input);
  assert.equal(result.success, true, result.error?.message);
  if (expected !== undefined) {
    assert.deepEqual(result.data, expected);
  }
  return result.data;
}

function assertRejects(schema, input) {
  const result = schema.safeParse(input);
  assert.equal(result.success, false, "Expected schema to reject input.");
}

test("pool schemas trim values, apply defaults, and reject empty changes", () => {
  assertParses(poolCreateSchema, {
    name: "  Favorites  ",
    description: null,
    source: {
      type: "items",
      items: [{ name: "  Ada  ", tags: [" math "] }]
    }
  }, {
    name: "Favorites",
    description: null,
    visibility: "private",
    source: {
      type: "items",
      items: [{ name: "Ada", tags: ["math"] }]
    }
  });

  assertParses(poolUpdateSchema, { visibility: "public_unlisted" }, { visibility: "public_unlisted" });
  assertRejects(poolUpdateSchema, {});
  assertRejects(poolCreateSchema, { name: "", visibility: "private" });
  assertRejects(poolCreateSchema, {
    name: "No source data",
    source: { type: "extract", prompt: "extract", text: null, html: null, urls: [] }
  });
});

test("pool candidate/import management schemas validate ids and payload shape", () => {
  assertParses(poolCandidateAttachSchema, { candidateIds: [UUID] }, { candidateIds: [UUID] });
  assertParses(poolCandidateCreateSchema, { name: "  Ada  ", imageUrl: null }, {
    name: "Ada",
    imageUrl: null,
    tags: []
  });
  assertParses(poolImportSchema, { sourcePoolId: UUID }, { sourcePoolId: UUID });
  assertParses(poolImportSchema, {
    source: {
      type: "extract",
      prompt: "extract",
      urls: ["https://example.com/list"]
    }
  });
  assertParses(poolTagManagementSchema, { removeTag: "  old  " }, { removeTag: "old" });
  assertParses(poolTagThresholdCleanupSchema, { removeTagsAtOrBelowCount: 3 });
  assertParses(poolSourceEnrichmentSchema, { enrichFromSourceUrls: true });

  assertRejects(poolCandidateAttachSchema, { candidateIds: [] });
  assertRejects(poolCandidateCreateSchema, { name: "Ada", imageUrl: "not-a-url" });
  assertRejects(poolTagThresholdCleanupSchema, { removeTagsAtOrBelowCount: 0 });
  assertRejects(poolSourceEnrichmentSchema, { enrichFromSourceUrls: false });
});

test("tournament schemas validate defaults, update commands, and invalid transitions", () => {
  assertParses(tournamentCreateSchema, {
    title: "  Best snack  ",
    sharingMode: "private",
    playStyle: "reseed",
    resultMode: "winner_only",
    tieBreakMode: "higher_seed_wins"
  }, {
    title: "Best snack",
    sharingMode: "private",
    visibility: "private",
    votingAccess: "signed_in_only",
    playStyle: "reseed",
    resultMode: "winner_only",
    tieBreakMode: "higher_seed_wins",
    advancementMode: "vote_winner"
  });
  assertParses(tournamentUpdateSchema, { closeCurrentRound: true }, { closeCurrentRound: true });
  assertParses(tournamentUpdateSchema, { status: "active" }, { status: "active" });

  assertRejects(tournamentCreateSchema, {
    title: "Bad",
    sharingMode: "private",
    playStyle: "reseed",
    resultMode: "winner_only",
    tieBreakMode: "coin_flip"
  });
  assertRejects(tournamentUpdateSchema, {});
  assertRejects(tournamentUpdateSchema, { status: "archived" });
});

test("parallel tournament schemas validate defaults and non-empty updates", () => {
  assertParses(parallelTournamentCreateSchema, {
    title: "  Team bracket  ",
    sourcePoolId: UUID,
    sharingMode: "with_friends"
  }, {
    title: "Team bracket",
    sourcePoolId: UUID,
    sharingMode: "with_friends",
    visibility: "private",
    votingAccess: "signed_in_only",
    playStyle: "fixed_bracket",
    resultMode: "parallel_full_ranking",
    tieBreakMode: "higher_seed_wins"
  });
  assertParses(parallelTournamentUpdateSchema, { status: "complete" }, { status: "complete" });

  assertRejects(parallelTournamentCreateSchema, { title: "Bad", sourcePoolId: "nope", sharingMode: "private" });
  assertRejects(parallelTournamentUpdateSchema, {});
});

test("candidate, vote, match, admin, and bracket template schemas cover route payloads", () => {
  assertParses(candidateCreateSchema, { name: "  Ada  ", tags: [" math "] }, {
    name: "Ada",
    tags: ["math"]
  });
  assertParses(candidateUpdateSchema, { imageUrl: null }, { imageUrl: null });
  assertRejects(candidateUpdateSchema, {});

  assertParses(voteCreateSchema, { selectedEntryId: UUID });
  assertRejects(voteCreateSchema, { selectedEntryId: "entry-1" });
  assertParses(matchWinnerUpdateSchema, { winnerEntryId: null }, { winnerEntryId: null });
  assertParses(matchWinnerUpdateSchema, { winnerEntryId: UUID }, { winnerEntryId: UUID });

  assertParses(adminVisibilityUpdateSchema, { visibility: "public_listed" });
  assertParses(adminPoolUpdateSchema, { featuredOnHome: false }, { featuredOnHome: false });
  assertRejects(adminPoolUpdateSchema, {});

  assertParses(bracketTemplateCreateSchema, {
    name: "  Template  ",
    subBrackets: [{
      name: "Finals",
      slotCount: 2,
      displayOrder: 0,
      slots: [{ seed: 1, templateSlot: 0 }]
    }]
  });
  assertParses(bracketTemplateUpdateSchema, {
    name: "Template",
    archive: true,
    subBrackets: [{
      name: "Finals",
      slotCount: 2,
      displayOrder: 0,
      slots: []
    }]
  });
  assertRejects(bracketTemplateCreateSchema, { name: "No brackets", subBrackets: [] });
});

test("pool import html compaction preserves prioritized structured fragments", () => {
  const compacted = compactHtmlForImport(`${"x".repeat(250000)}<table class="wikitable"><tr><td>Ada</td></tr></table>`);

  assert.equal(compacted, '<table class="wikitable"><tr><td>Ada</td></tr></table>');
});
