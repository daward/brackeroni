function countMatches(value, pattern) {
  return [...String(value || "").matchAll(pattern)].length;
}

export function analyzeCapturedHtml({ html, pageUrl = null }) {
  const normalizedHtml = String(html || "");

  if (!normalizedHtml) {
    return [];
  }

  const customTagMatches = [...normalizedHtml.matchAll(/<([a-z][a-z0-9]*-[a-z0-9-]+)\b/gi)];
  const customTagCounts = new Map();

  for (const match of customTagMatches) {
    const tagName = match[1].toLowerCase();
    customTagCounts.set(tagName, (customTagCounts.get(tagName) || 0) + 1);
  }

  const repeatedListTags = [...customTagCounts.entries()]
    .filter(([tagName, count]) => /(?:card|tile|item|result|listing|entry|row)$/i.test(tagName) && count >= 8)
    .sort((left, right) => right[1] - left[1]);

  const frameworkSignalCount =
    Number(/<router-outlet\b/i.test(normalizedHtml)) +
    Number(/\b_ngcontent-[a-z0-9-]+=/i.test(normalizedHtml)) +
    Number(/\bleaflet-[a-z-]+\b/i.test(normalizedHtml)) +
    Number(/\bdata-reactroot\b/i.test(normalizedHtml)) +
    Number(/\b__next\b/i.test(normalizedHtml)) +
    Number(/\bloading=["']lazy["']/i.test(normalizedHtml));

  const anchorImageCount = countMatches(
    normalizedHtml,
    /<a\b[\s\S]*?<img\b/gi
  );

  const warnings = [];
  const strongestRepeatedTag = repeatedListTags[0] || null;

  if (
    strongestRepeatedTag &&
    frameworkSignalCount >= 2 &&
    strongestRepeatedTag[1] === anchorImageCount &&
    strongestRepeatedTag[1] <= 40
  ) {
    let sourceHost = null;

    if (pageUrl) {
      try {
        sourceHost = new URL(pageUrl).hostname;
      } catch {}
    }

    warnings.push({
      code: "POSSIBLE_PARTIAL_DYNAMIC_CAPTURE",
      level: "warning",
      message:
        `This page looks like a dynamic list capture and currently includes ${strongestRepeatedTag[1]} rendered result cards in the DOM.` +
        " If you expected more items, scroll or expand the list before importing so Brackeroni can capture the rest." +
        (sourceHost ? ` Source: ${sourceHost}.` : "")
    });
  }

  return warnings;
}
