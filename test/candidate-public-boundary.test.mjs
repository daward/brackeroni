import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectories = ["app", "components", "lib", "test"].map((directory) => path.join(rootDirectory, directory));
const boundaryTestPath = fileURLToPath(import.meta.url);
const internalImportMarker = ["components", "pools", "candidates", "internal"].join("/");
const candidateDirectory = path.join(rootDirectory, "components", "pools", "candidates");

function getJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getJavaScriptFiles(filePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

test("candidate internals are not imported outside the candidate feature", () => {
  const violations = sourceDirectories
    .flatMap(getJavaScriptFiles)
    .filter((filePath) => filePath !== boundaryTestPath)
    .filter((filePath) => !filePath.startsWith(candidateDirectory))
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes(internalImportMarker));

  assert.deepEqual(violations, []);
});

test("candidate management keeps only its public API at the feature root", () => {
  const rootEntries = fs
    .readdirSync(candidateDirectory, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(rootEntries, ["index.ts", "internal", "types.ts"]);
});
