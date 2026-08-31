// @vitest-environment node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, it } from "vitest";
import { fileURLToPath } from "node:url";

describe("lib domain public boundaries", () => {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const sourceDirectories = ["app", "components", "lib"].map((directory) => path.join(rootDirectory, directory));
  const testDirectory = path.join(rootDirectory, "test");
  const boundaryTestPath = fileURLToPath(import.meta.url);
  const adminDirectory = path.join(rootDirectory, "lib", "admin");
  const apiContractDirectory = path.join(rootDirectory, "openapi");
  const bracketsDirectory = path.join(rootDirectory, "lib", "brackets");
  const dataDirectory = path.join(rootDirectory, "lib", "data");
  const poolsDirectory = path.join(rootDirectory, "lib", "pools");
  const legacyLibDirectories = [
    dataDirectory,
    path.join(rootDirectory, "lib", "create-workspace"),
    path.join(rootDirectory, "lib", "pool-detail"),
    path.join(rootDirectory, "lib", "services"),
    path.join(rootDirectory, "lib", "tournament")
  ];
  const legacyLibFiles = [
    path.join(rootDirectory, "lib", "bracket-modes.js")
  ];
  let sourceFiles;
  let testFiles;
  const fileSources = new Map();

  function getSourceFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return getSourceFiles(filePath);
      return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
    });
  }

  function sourceFor(filePath) {
    if (!fileSources.has(filePath)) {
      fileSources.set(filePath, fs.readFileSync(filePath, "utf8"));
    }

    return fileSources.get(filePath);
  }

  beforeAll(() => {
    sourceFiles = sourceDirectories.flatMap(getSourceFiles);
    testFiles = getSourceFiles(testDirectory);
  });

  it("routes runtime data imports through app-owned lib roots", () => {
    const violations = sourceFiles
      .filter((filePath) => sourceFor(filePath).includes("@/lib/data"));

    assert.deepEqual(violations, []);
  });

  it("keeps legacy lib directories empty of source files", () => {
    const legacySourceFiles = legacyLibDirectories.flatMap((directory) => (
      fs.existsSync(directory) ? getSourceFiles(directory) : []
    ));

    assert.deepEqual(legacySourceFiles, []);
  });

  it("prevents legacy lib files from reappearing", () => {
    const existingLegacyFiles = legacyLibFiles.filter((filePath) => fs.existsSync(filePath));

    assert.deepEqual(existingLegacyFiles, []);
  });

  it("keeps pool internals private to the pool domain", () => {
    const violations = sourceFiles
      .filter((filePath) => !filePath.startsWith(poolsDirectory))
      .filter((filePath) => sourceFor(filePath).includes("@/lib/pools/internal"));

    assert.deepEqual(violations, []);
  });

  it("exercises the pool domain through its public package interface", () => {
    const violations = testFiles
      .filter((filePath) => filePath !== boundaryTestPath)
      .filter((filePath) => {
        const source = sourceFor(filePath);
        return source.includes("@/lib/pools/internal") || source.includes("../../lib/pools/internal");
      })
      .map((filePath) => path.relative(rootDirectory, filePath));

    assert.deepEqual(violations, []);
  });

  it("exposes only intentional pool public entry points", () => {
    const allowedPoolImports = new Set([
      "@/lib/pools",
      "@/lib/pools/types"
    ]);
    const violations = sourceFiles
      .filter((filePath) => !filePath.startsWith(poolsDirectory))
      .flatMap((filePath) => {
        const source = sourceFor(filePath);
        const matches = source.matchAll(/@\/lib\/pools(?:\/[A-Za-z0-9_-]+)+/g);
        return [...matches]
          .map((match) => match[0])
          .filter((importPath) => !allowedPoolImports.has(importPath))
          .map((importPath) => `${path.relative(rootDirectory, filePath)} -> ${importPath}`);
      });

    assert.deepEqual(violations, []);
  });

  it("keeps admin internals private to the admin domain", () => {
    const violations = sourceFiles
      .filter((filePath) => !filePath.startsWith(adminDirectory))
      .filter((filePath) => sourceFor(filePath).includes("@/lib/admin/internal"));

    assert.deepEqual(violations, []);
  });

  it("keeps bracket internals private to the bracket domain", () => {
    const violations = sourceFiles
      .filter((filePath) => !filePath.startsWith(bracketsDirectory))
      .filter((filePath) => sourceFor(filePath).includes("@/lib/brackets/internal"));

    assert.deepEqual(violations, []);
  });

  it("exposes only intentional bracket public entry points", () => {
    const bracketRootFiles = fs.readdirSync(bracketsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    const violations = sourceFiles
      .filter((filePath) => !filePath.startsWith(bracketsDirectory))
      .flatMap((filePath) => {
        const source = sourceFor(filePath);
        const matches = source.matchAll(/@\/lib\/brackets(?:\/[A-Za-z0-9_-]+)+/g);
        return [...matches]
          .map((match) => match[0])
          .filter((importPath) => importPath !== "@/lib/brackets/types")
          .filter((importPath) => !importPath.startsWith("@/lib/brackets/engine/"))
          .map((importPath) => `${path.relative(rootDirectory, filePath)} -> ${importPath}`);
      });

    assert.deepEqual(bracketRootFiles, ["index.ts", "types.ts"]);
    assert.deepEqual(violations, []);
  });

  it("keeps public bracket routes bracket-named", () => {
    const legacyRoutePattern = /\/api\/(?:admin\/)?(?:parallel-)?tournaments|[?&](?:parallelTournament|tournament)=/;
    const routeFiles = getSourceFiles(path.join(rootDirectory, "app", "api"))
      .map((filePath) => path.relative(rootDirectory, filePath).replaceAll(path.sep, "/"));
    const legacyRouteFiles = routeFiles.filter((filePath) => /tournament/i.test(filePath));
    const legacyRouteStrings = [...sourceFiles, ...getSourceFiles(apiContractDirectory)]
      .filter((filePath) => legacyRoutePattern.test(sourceFor(filePath)))
      .map((filePath) => path.relative(rootDirectory, filePath));

    assert.deepEqual([...legacyRouteFiles, ...legacyRouteStrings], []);
  });

  it("keeps bracket engine and internals in TypeScript", () => {
    const bracketImplementationFiles = [
      path.join(bracketsDirectory, "engine"),
      path.join(bracketsDirectory, "internal")
    ].flatMap(getSourceFiles);
    const violations = bracketImplementationFiles
      .filter((filePath) => filePath.endsWith(".js") || filePath.endsWith(".jsx"))
      .map((filePath) => path.relative(rootDirectory, filePath));

    assert.deepEqual(violations, []);
  });

  it("keeps the bracket engine under TypeScript checking", () => {
    const engineSourceFiles = getSourceFiles(path.join(bracketsDirectory, "engine"));
    const violations = engineSourceFiles
      .filter((filePath) => sourceFor(filePath).includes("@ts-nocheck"))
      .map((filePath) => path.relative(rootDirectory, filePath));

    assert.deepEqual(violations, []);
  });

  it("keeps stateful bracket workflows behind public tests", () => {
    const statefulWorkflowImportPattern = /lib\/brackets\/internal\/stateful-workflows|@\/lib\/brackets\/internal\/stateful-workflows/;
    const violations = testFiles
      .filter((filePath) => filePath !== boundaryTestPath)
      .filter((filePath) => statefulWorkflowImportPattern.test(sourceFor(filePath)))
      .map((filePath) => path.relative(rootDirectory, filePath));

    assert.deepEqual(violations, []);
  });
});
