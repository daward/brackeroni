import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentDirectory = path.join(rootDirectory, "components");
const candidateDirectory = path.join(componentDirectory, "pools", "candidates");

function getJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getJavaScriptFiles(filePath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

test("candidate internals are not imported outside the candidate feature", () => {
  const violations = getJavaScriptFiles(componentDirectory)
    .filter((filePath) => !filePath.startsWith(candidateDirectory))
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes("components/pools/candidates/internal"));

  assert.deepEqual(violations, []);
});
