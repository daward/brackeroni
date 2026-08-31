import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("bracket templates", () => {
  let calls;
  let library;
  let responses;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [[]];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { bracketTemplates } = await import("@/lib/brackets");
    library = bracketTemplates({ userId: "user-1" });
  });

  function createSql() {
    return Object.assign(
      (strings, ...values) => {
        calls.push({ sql: strings.join("?").replace(/\s+/g, " ").trim(), values });
        return Promise.resolve(responses.shift() ?? []);
      },
      { begin: async (callback) => callback(createSql()) },
    );
  }

  it("lists built-in templates beside user templates", async () => {
    const templates = await library.list();

    assert.deepEqual(templates.builtIn.map((template) => template.id), ["builtin-standard", "builtin-ncaa"]);
    assert.deepEqual(templates.user, []);
    assert.deepEqual(calls[0].values, ["user-1"]);
  });

  it("creates a template with saved sub-brackets", async () => {
    responses = [
      [{ id: "template-1", name: "Regions", description: null }],
      [{ id: "sub-1", name: "East", tag: "East", slotCount: 2, feedOrder: 1, displayOrder: 0 }],
      [],
    ];

    const template = await library.create({
      name: "Regions",
      subBrackets: [subBracket()],
    });

    assert.equal(template.id, "template-1");
    assert.equal(template.subBrackets[0].id, "sub-1");
    assert.equal(calls.some((call) => call.sql.startsWith("insert into bracket_template_slot")), true);
  });

  it("archives a template owned by the user", async () => {
    responses = [[{ id: "template-1" }], []];

    const result = await library.update({ templateId: "template-1", archive: true });

    assert.equal(result, null);
    assert.equal(calls.at(-1).values[0], "template-1");
  });

  it("updates template slots for the user", async () => {
    responses = [
      [{ id: "template-1" }],
      [],
      [],
      [{ id: "sub-1" }],
      [],
      [{ id: "template-1", name: "Regions", description: null }],
    ];

    const template = await library.update({
      templateId: "template-1",
      name: "Regions",
      subBrackets: [subBracket()],
    });

    assert.equal(template.id, "template-1");
    assert.equal(template.subBrackets[0].name, "East");
    assert.equal(calls.some((call) => call.sql.startsWith("delete from bracket_template_sub_bracket")), true);
  });

  function subBracket() {
    return {
      name: "East",
      tag: "East",
      slotCount: 2,
      feedOrder: 1,
      displayOrder: 0,
      slots: [{ seed: 1, subSeed: 0, tag: "East", templateSlot: 0 }],
    };
  }
});
