import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "vitest";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceDirectories = ["app", "components", "lib"].map((directory) => path.join(rootDirectory, directory));
const boundaryTestPath = fileURLToPath(import.meta.url);
const internalImportMarker = ["components", "brackets", "progress", "internal"].join("/");
const progressDirectory = path.join(rootDirectory, "components", "brackets", "progress");

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(filePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

test("bracket progress internals are not imported outside the progress feature", () => {
  const violations = sourceDirectories
    .flatMap(getSourceFiles)
    .filter((filePath) => filePath !== boundaryTestPath)
    .filter((filePath) => !filePath.startsWith(progressDirectory))
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes(internalImportMarker));

  assert.deepEqual(violations, []);
});

test("bracket progress keeps only its public API at the feature root", () => {
  const rootEntries = fs
    .readdirSync(progressDirectory, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(rootEntries, ["index.ts", "internal", "types.ts"]);
});
