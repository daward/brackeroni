import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(new URL("./package.json", import.meta.url)));

function resolveAliasTarget(specifier) {
  if (!specifier.startsWith("@/")) {
    return null;
  }

  const relativePath = specifier.slice(2);
  const basePath = path.join(workspaceRoot, relativePath);

  if (path.extname(basePath)) {
    return basePath;
  }

  const candidates = [
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export async function resolve(specifier, context, defaultResolve) {
  const aliasTarget = resolveAliasTarget(specifier);

  if (aliasTarget) {
    return {
      url: pathToFileURL(aliasTarget).href,
      shortCircuit: true
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
}