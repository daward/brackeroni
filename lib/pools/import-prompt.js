/** Builds the common extraction instruction used when importing a pool. */
export function buildPoolImportPrompt(poolName) {
  const trimmedName = poolName.trim();
  const subject = trimmedName ? `"${trimmedName}"` : "the target pool";

  return [
    `Extract a candidate pool for ${subject}.`,
    "Be exhaustive rather than selective.",
    "If the source is a bulleted or numbered list, treat each distinct bullet or list item as a candidate unless it is clearly not one.",
    "Return distinct candidate names only when they are directly supported by the source text.",
    "Prefer canonical names over aliases.",
    "Do not invent candidates or fill gaps with guesses.",
    "If the same candidate appears more than once, include it once.",
    "Keep rationale and excerpt very short so the full list can fit in the response."
  ].join(" ");
}
