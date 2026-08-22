export function isGeneratedPoolSourceDescription(description, sourceUrl) {
  if (!description || !sourceUrl) {
    return false;
  }

  try {
    return description.trim() === `Imported from ${new URL(sourceUrl).hostname}`;
  } catch {
    return false;
  }
}
