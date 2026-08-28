import { beforeEach, vi } from "vitest";

let currentSql = null;
let currentCandidateSupport = { hasTags: true, hasSourceUrl: true };
let currentCandidateEnrichment = {
  description: "Generated description",
  imageUrl: "https://example.com/image.jpg",
  tags: ["Generated", "Profile"]
};

vi.mock("@/lib/db", () => ({
  getDb() {
    if (!currentSql) throw new Error("TEST_SQL_NOT_CONFIGURED");
    return currentSql;
  }
}));

vi.mock("@/lib/shared-data/candidate-schema", () => ({
  getCandidateSchemaSupport() {
    return currentCandidateSupport;
  }
}));

vi.mock("@/lib/gemini/enrich-candidate-source", () => ({
  enrichCandidateFromSource() {
    return currentCandidateEnrichment;
  }
}));

function normalizeSql(strings) {
  return strings.join("?").replace(/\s+/g, " ").trim();
}

export function createSql(responses = []) {
  const calls = [];

  function sql(strings, ...values) {
    if (typeof strings?.join !== "function") {
      return { values: strings };
    }

    const call = { sql: normalizeSql(strings), values };
    if (!/^(select|insert|update|delete)\b/i.test(call.sql)) {
      return call;
    }

    calls.push(call);
    return Promise.resolve(responses.shift() ?? []);
  }

  sql.begin = async (callback) => callback(sql);

  return { calls, sql };
}

export function useSql(sql) {
  currentSql = sql;
}

export function useCandidateSupport(support) {
  currentCandidateSupport = support;
}

export function useCandidateEnrichment(enrichment) {
  currentCandidateEnrichment = enrichment;
}

export function poolSupport(overrides = {}) {
  return [{
    hasVisibility: true,
    hasPublishedAt: true,
    hasSourcePoolId: true,
    hasFeaturedOnHome: true,
    hasImportSourceUrl: true,
    hasImportSourceTitle: true,
    hasEnrichmentCursorDisplayOrder: true,
    ...overrides
  }];
}

export function poolRow(overrides = {}) {
  return [{
    id: "pool-1",
    creatorUserId: "user-1",
    name: "Favorites",
    description: null,
    visibility: "private",
    importSourceUrl: null,
    importSourceTitle: null,
    enrichmentCursorDisplayOrder: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    candidateCount: 1,
    ...overrides
  }];
}

export function candidateRows(rows = []) {
  return rows.map((row, index) => ({
    id: `candidate-${index + 1}`,
    name: `Candidate ${index + 1}`,
    description: null,
    imageUrl: null,
    sourceUrl: null,
    tags: [],
    displayOrder: index,
    ...row
  }));
}

export async function importPools() {
  return import("../../../lib/pools");
}

beforeEach(() => {
  currentSql = null;
  currentCandidateSupport = { hasTags: true, hasSourceUrl: true };
  currentCandidateEnrichment = {
    description: "Generated description",
    imageUrl: "https://example.com/image.jpg",
    tags: ["Generated", "Profile"]
  };
  vi.unstubAllGlobals();
  vi.resetModules();
});
