import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentDirectory = path.join(rootDirectory, "components");
const detailDirectory = path.join(componentDirectory, "pools", "detail");

function getSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(filePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

test("pool-detail internals are not imported outside the detail feature", () => {
  const violations = getSourceFiles(componentDirectory)
    .filter((filePath) => !filePath.startsWith(detailDirectory))
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes("components/pools/detail/internal"));

  assert.deepEqual(violations, []);
});
