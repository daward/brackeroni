import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "vitest";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const componentDirectory = path.join(rootDirectory, "components");
const sharedDirectory = path.join(componentDirectory, "shared");

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(filePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

test("shared internals are not imported outside the shared package", () => {
  const violations = getSourceFiles(componentDirectory)
    .filter((filePath) => !filePath.startsWith(sharedDirectory))
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes("components/shared/internal"));

  assert.deepEqual(violations, []);
});
