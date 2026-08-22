import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentDirectory = path.join(rootDirectory, "components");
const sharedDirectory = path.join(componentDirectory, "brackets", "shared");

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(filePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

test("bracket shared internals are not imported outside the shared feature", () => {
  const violations = getSourceFiles(componentDirectory)
    .filter((filePath) => !filePath.startsWith(sharedDirectory))
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes("components/brackets/shared/internal"));

  assert.deepEqual(violations, []);
});
