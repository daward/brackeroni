import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "vitest";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceDirectories = ["app", "components", "lib"].map((directory) => path.join(rootDirectory, directory));
const bracketsDirectory = path.join(rootDirectory, "components", "brackets");
const subfeatureImportPattern = /@\/components\/brackets\/[^"';\s]+/;

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(filePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

test("runtime code outside brackets imports the bracket app only from its root", () => {
  const violations = sourceDirectories
    .flatMap(getSourceFiles)
    .filter((filePath) => !filePath.startsWith(bracketsDirectory))
    .filter((filePath) => subfeatureImportPattern.test(fs.readFileSync(filePath, "utf8")));

  assert.deepEqual(violations, []);
});
