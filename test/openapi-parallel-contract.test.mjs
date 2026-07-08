import test from "node:test";
import assert from "node:assert/strict";

import { openApiDocument } from "../openapi/document.js";

test("OpenAPI parallel participant status enum includes invited", () => {
  const statusEnum =
    openApiDocument.components.schemas.ParallelTournamentParticipant.properties.status.enum;

  assert.deepEqual(statusEnum, ["invited", "active", "complete"]);
});
