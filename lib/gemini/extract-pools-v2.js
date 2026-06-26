const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const candidatePoolSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          rationale: { anyOf: [{ type: "string" }, { type: "null" }] },
          score: { anyOf: [{ type: "number" }, { type: "null" }] },
          imageUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
          sourceUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
          sourceTitle: { anyOf: [{ type: "string" }, { type: "null" }] },
          excerpt: { anyOf: [{ type: "string" }, { type: "null" }] }
        },
        required: ["label", "rationale", "score", "imageUrl", "sourceUrl", "sourceTitle", "excerpt"]
      }
    }
  },
  required: ["candidates"]
};

const CHUNK_LINE_LIMIT = 120;
const CHUNK_TEXT_THRESHOLD = 12000;
const STRUCTURED_LIST_MIN_ITEMS = 20;

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|br|tr|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

function buildPrompt({ prompt, text, html, urls, pageUrl }) {
  const sections = [
    "Extract a candidate pool from the provided material.",
    "Follow the extraction instructions exactly.",
    "Return only structured candidate data that is directly supported by the sources.",
    "Be exhaustive. If the source contains a list of candidates, include every distinct supported candidate rather than a shortlist.",
    "When HTML contains repeated cards or list items, use the linked title as the candidate label.",
    "Preserve image URLs when an item has an obvious image.",
    "Preserve source URLs when an item has an obvious link.",
    "",
    "Extraction instructions:",
    prompt
  ];

  if (urls.length > 0) {
    sections.push("", "Source URLs:", ...urls.map((url, index) => `${index + 1}. ${url}`));
  }

  if (text) {
    sections.push("", "Plain text source:", text);
  }

  if (html) {
    sections.push("", "HTML converted to text:", stripHtml(html));

    const imageHints = buildImageHints(html, pageUrl || urls[0] || null);

    if (imageHints.length > 0) {
      sections.push("", "Image URL hints from the HTML:", ...imageHints);
    }
  }

  return sections.join("\n");
}

function normalizeLine(value) {
  return String(value || "")
    .replace(/^\s*(?:[-*+]|•|◦|▪|▫)\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

function collapseWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLookupKey(value) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/^(?:#\s*)?\d+\s*(?:[.)\-:]\s*|\s+)/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isMetaDescription(value) {
  const normalized = collapseWhitespace(value).toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    "listed as a trivia item",
    "included as a trivia item",
    "selected from the source material",
    "mentioned in the source material",
    "appears in the source material"
  ].some((phrase) => normalized.startsWith(phrase));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLabelPrefix(text, label) {
  const normalizedText = collapseWhitespace(text);
  const normalizedLabel = collapseWhitespace(label);

  if (!normalizedText || !normalizedLabel) {
    return normalizedText;
  }

  const prefixPattern = new RegExp(
    `^${escapeRegExp(normalizedLabel)}\\s*(?:[-:|\\u2013\\u2014]\\s*|\\(\\s*)?`,
    "i"
  );
  const withoutPrefix = normalizedText.replace(prefixPattern, "").replace(/\)\s*$/, "").trim();

  if (!withoutPrefix || withoutPrefix.toLowerCase() === normalizedLabel.toLowerCase()) {
    return "";
  }

  return withoutPrefix;
}

function deriveCandidateDescription({ label, rationale, excerpt }) {
  const cleanedExcerpt = removeLabelPrefix(excerpt, label);

  if (cleanedExcerpt) {
    return cleanedExcerpt;
  }

  if (!isMetaDescription(rationale)) {
    const cleanedRationale = removeLabelPrefix(rationale, label) || collapseWhitespace(rationale);

    if (cleanedRationale && !isMetaDescription(cleanedRationale)) {
      return cleanedRationale;
    }
  }

  return null;
}

function isUrlOnlyLine(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return false;
  }

  return (
    /^\[.*\]\((https?:\/\/[^)\s]+)\)\s*$/i.test(trimmed) ||
    /^https?:\/\/\S+\s*$/i.test(trimmed)
  );
}

function extractUrlFromText(value) {
  const markdownMatch = String(value || "").match(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownMatch) {
    return markdownMatch[1];
  }

  const plainMatch = String(value || "").match(/https?:\/\/\S+/i);
  return plainMatch ? plainMatch[0].replace(/[),.;]+$/, "") : null;
}

function toAbsoluteUrl(value, pageUrl) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, pageUrl || "http://localhost").href;
  } catch {
    return null;
  }
}

function parseTagAttributes(tagHtml) {
  const attributes = {};

  for (const match of String(tagHtml || "").matchAll(/([^\s=/>]+)\s*=\s*["']([^"']*)["']/gi)) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(match[2]);
  }

  return attributes;
}

function normalizeImageUrlCandidate(value, pageUrl) {
  const normalized = String(value || "").trim();

  if (!normalized || normalized.startsWith("data:")) {
    return null;
  }

  return toAbsoluteUrl(normalized, pageUrl);
}

function extractBestSrcsetUrl(value, pageUrl) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return null;
  }

  const candidates = [];
  const pattern = /(\S+)\s+(\d+(?:\.\d+)?[wx])(?=,\s*https?:\/\/|,\s*\/|$)/gi;
  let match;

  while ((match = pattern.exec(rawValue)) !== null) {
    const url = match[1];
    const descriptor = match[2];
    const widthMatch = descriptor.match(/(\d+)w/i);
    const densityMatch = descriptor.match(/(\d+(?:\.\d+)?)x/i);
    const score = widthMatch
      ? Number(widthMatch[1])
      : densityMatch
        ? Number(densityMatch[1]) * 1000
        : 0;

    candidates.push({
      url: normalizeImageUrlCandidate(url, pageUrl),
      score
    });
  }

  const resolvedCandidates = candidates.filter((entry) => entry.url);

  if (resolvedCandidates.length === 0) {
    return null;
  }

  resolvedCandidates.sort((left, right) => right.score - left.score);
  return resolvedCandidates[0].url;
}

function extractBestImageUrlFromTag(tagHtml, pageUrl) {
  const attributes = parseTagAttributes(tagHtml);
  const srcsetCandidates = [
    attributes.srcset,
    attributes["data-srcset"],
    attributes["data-lazy-srcset"]
  ];

  for (const candidate of srcsetCandidates) {
    const resolved = extractBestSrcsetUrl(candidate, pageUrl);

    if (resolved) {
      return resolved;
    }
  }

  const directCandidates = [
    attributes.src,
    attributes["data-src"],
    attributes["data-lazy-src"],
    attributes["data-lazyurl"],
    attributes["data-original"],
    attributes["data-image"],
    attributes.poster
  ];

  for (const candidate of directCandidates) {
    const resolved = normalizeImageUrlCandidate(candidate, pageUrl);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function stripMarkdownLinkSyntax(value) {
  return String(value || "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .trim();
}

function parseStructuredListBlock(block) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const titleLine = normalizeLine(lines[0]);
  if (!titleLine) {
    return null;
  }

  const sourceUrl = lines.map(extractUrlFromText).find(Boolean) || null;
  const bodyText = stripMarkdownLinkSyntax(lines.slice(1).join(" "));
  const separators = [" - ", " – ", " — ", ": "];
  let label = titleLine;
  let description = bodyText || null;

  for (const separator of separators) {
    if (titleLine.includes(separator)) {
      const [left, ...rest] = titleLine.split(separator);
      const possibleLabel = collapseWhitespace(left);
      const remainder = collapseWhitespace(rest.join(separator));

      if (possibleLabel && remainder) {
        label = possibleLabel;
        description = remainder || description;
        break;
      }
    }
  }

  return {
    label: collapseWhitespace(label),
    description: description ? collapseWhitespace(description) : null,
    rationale: null,
    score: 1,
    sourceUrl,
    sourceTitle: null,
    excerpt: null
  };
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const deduped = [];

  for (const candidate of candidates) {
    const key = candidate.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function stripHtmlTags(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p|li|section|article|tr|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractFragmentSectionHtml(html, pageUrl) {
  const normalizedHtml = String(html || "");

  if (!normalizedHtml || !pageUrl) {
    return normalizedHtml;
  }

  let fragment = "";

  try {
    fragment = new URL(pageUrl).hash.replace(/^#/, "");
  } catch {
    return normalizedHtml;
  }

  if (!fragment) {
    return normalizedHtml;
  }

  const escapedFragment = escapeRegExp(fragment);
  const markerPattern = new RegExp(`(?:id|name)=["']${escapedFragment}["']`, "ig");
  const markerMatches = [...normalizedHtml.matchAll(markerPattern)];
  const markerMatch = markerMatches.at(-1);

  if (!markerMatch || markerMatch.index === undefined) {
    return normalizedHtml;
  }

  const headingStart = normalizedHtml.lastIndexOf("<h", markerMatch.index);
  const start = headingStart >= 0 ? headingStart : markerMatch.index;
  const remainder = normalizedHtml.slice(start + 1);
  const nextHeadingMatch = /<h[23][^>]*>/i.exec(remainder);
  const end = nextHeadingMatch?.index ? start + 1 + nextHeadingMatch.index : normalizedHtml.length;
  const sectionHtml = normalizedHtml.slice(start, end);

  return /<tr\b|<li\b|<img\b|<a\b/i.test(sectionHtml) ? sectionHtml : normalizedHtml;
}

function isStatOnlyDescription(value) {
  const normalized = collapseWhitespace(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  if (/^(games?|victories|wins?)(\s*[•|:-]\s*)?$/.test(normalized)) {
    return true;
  }

  if (/^[\d\s()+.%•:-]+$/.test(normalized)) {
    return true;
  }

  const stripped = normalized.replace(/games|victories|wins|rank|elo/g, "");

  return /(?:games|victories|wins|rank|elo)/.test(normalized) && !/[a-z]/.test(stripped);
}

function parseHtmlCardCandidates(html, pageUrl) {
  const normalizedHtml = extractFragmentSectionHtml(html, pageUrl);

  if (!normalizedHtml) {
    return [];
  }

  const imgMatches = [...normalizedHtml.matchAll(/<img\b[^>]*>/gi)];

  if (imgMatches.length < 4) {
    return [];
  }

  const candidates = [];

  for (let index = 0; index < imgMatches.length; index += 1) {
    const start = imgMatches[index].index ?? 0;
    const end = imgMatches[index + 1]?.index ?? Math.min(normalizedHtml.length, start + 2500);
    const block = normalizedHtml.slice(start, end);
    const imageUrl = extractBestImageUrlFromTag(imgMatches[index][0], pageUrl);
    const anchorMatches = [...block.matchAll(/<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const titleAnchor = anchorMatches.find((match) => {
      const text = collapseWhitespace(stripHtmlTags(match[2]));

      return (
        text &&
        /[a-z]/i.test(text) &&
        !/^my statistics for this game$/i.test(text) &&
        !/^remove$/i.test(text)
      );
    });

    if (!titleAnchor) {
      continue;
    }

    const label = normalizeLine(collapseWhitespace(stripHtmlTags(titleAnchor[2])));

    if (!label || !/[a-z]/i.test(label) || /^my statistics for this game$/i.test(label)) {
      continue;
    }

    const sourceUrl = toAbsoluteUrl(titleAnchor[1], pageUrl);
    const textLines = stripHtmlTags(block)
      .split("\n")
      .map((line) => collapseWhitespace(line))
      .filter(Boolean)
      .filter((line) => {
        const normalized = line.toLowerCase();

        return (
          normalized !== label.toLowerCase() &&
          normalized !== "my statistics for this game" &&
          normalized !== "remove"
        );
      });

    const description =
      textLines.find((line) => /games|victories|wins/i.test(line)) ||
      textLines.find((line) => !/^\d+$/.test(line)) ||
      null;

    candidates.push({
      label,
      description: description && !isStatOnlyDescription(description) ? description : null,
      rationale: null,
      score: 1,
      imageUrl,
      sourceUrl,
      sourceTitle: null,
      excerpt: null
    });
  }

  const deduped = dedupeCandidates(candidates);

  return deduped.length >= 4 ? deduped : [];
}

function parseHtmlTableCandidates(html, pageUrl) {
  const normalizedHtml = extractFragmentSectionHtml(html, pageUrl);

  if (!normalizedHtml) {
    return [];
  }

  const rowMatches = [...normalizedHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];

  if (rowMatches.length < 8) {
    return [];
  }

  const candidates = [];

  for (const [, rowHtml] of rowMatches) {
    if (/<th\b/i.test(rowHtml) && !/<td\b/i.test(rowHtml)) {
      continue;
    }

    const linkMatches = [...rowHtml.matchAll(/<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const linkedTexts = linkMatches
      .map((match) => ({
        href: match[1],
        text: normalizeLine(collapseWhitespace(stripHtmlTags(match[2])))
      }))
      .filter((entry) => entry.text && /[a-z]/i.test(entry.text));

    if (linkedTexts.length === 0) {
      continue;
    }

    const preferred =
      linkedTexts.find((entry) => !/stanley cup|playoffs|finals|season|nhl/i.test(entry.text)) ||
      linkedTexts[0];

    if (!preferred?.text) {
      continue;
    }

    const rowTextParts = stripHtmlTags(rowHtml)
      .split("\n")
      .map((part) => collapseWhitespace(part))
      .filter(Boolean)
      .filter((part) => part.toLowerCase() !== preferred.text.toLowerCase());

    const yearPart = rowTextParts.find((part) => /\b(19|20)\d{2}\b/.test(part)) || null;
    const detailPart =
      rowTextParts.find(
        (part) =>
          part !== yearPart &&
          !/stanley cup|playoffs|finals|season|nhl/i.test(part) &&
          !/^\d+$/.test(part)
      ) || null;
    const description = [yearPart, detailPart].filter(Boolean).join(" - ") || yearPart || null;

    candidates.push({
      label: preferred.text,
      description: description && !isStatOnlyDescription(description) ? description : null,
      rationale: null,
      score: 1,
      imageUrl: null,
      sourceUrl: toAbsoluteUrl(preferred.href, pageUrl),
      sourceTitle: null,
      excerpt: null
    });
  }

  const deduped = dedupeCandidates(candidates);

  return deduped.length >= 8 ? deduped : [];
}

function parseBillboardGalleryCandidates(html, pageUrl) {
  const normalizedHtml = extractFragmentSectionHtml(html, pageUrl);

  if (!normalizedHtml || !/c-gallery-vertical__slide-wrapper/i.test(normalizedHtml)) {
    return [];
  }

  const slideMatches = [...normalizedHtml.matchAll(/<div class="c-gallery-vertical__slide-wrapper"[\s\S]*?(?=<div class="c-gallery-vertical__slide-wrapper"|$)/gi)];

  if (slideMatches.length < 20) {
    return [];
  }

  const candidates = [];

  for (const match of slideMatches) {
    const block = match[0];
    const rankMatch = block.match(/c-gallery-vertical-featured-image__number[^>]*>\s*(\d+)\s*</i);
    const titleMatch = block.match(/c-gallery-vertical-featured-image__title[^>]*>([\s\S]*?)<\/h2>/i);

    if (!titleMatch) {
      continue;
    }

    const label = normalizeLine(collapseWhitespace(stripHtmlTags(titleMatch[1])));
    if (!label) {
      continue;
    }

    const imageTagMatch = block.match(/<img\b[^>]*class="[^"]*c-gallery-vertical-featured-image__image[^"]*"[^>]*>/i);
    const imageUrl = imageTagMatch ? extractBestImageUrlFromTag(imageTagMatch[0], pageUrl) : null;
    const descriptionBlockMatch = block.match(/c-gallery-vertical-featured-image__description[\s\S]*?<div class="pmc-not-a-paywall">([\s\S]*?)<\/div><\/div><\/div>/i);
    const paragraphTexts = descriptionBlockMatch
      ? [...descriptionBlockMatch[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
          .map((entry) => collapseWhitespace(stripHtmlTags(entry[1])))
          .filter(Boolean)
      : [];
    const description = paragraphTexts[0] || null;
    const rank = rankMatch ? Number(rankMatch[1]) : null;
    const slideIndexMatch = block.match(/data-slide-index="(\d+)"/i);
    const slideFragment = slideIndexMatch ? `slide-${slideIndexMatch[1]}` : null;

    candidates.push({
      label,
      description,
      rationale: null,
      score: rank ? Math.max(0, Math.min(1, rank / 100)) : 1,
      imageUrl,
      sourceUrl: slideFragment && pageUrl ? `${pageUrl.replace(/#.*$/, "")}#${slideFragment}` : pageUrl || null,
      sourceTitle: null,
      excerpt: null
    });
  }

  const deduped = dedupeCandidates(candidates);
  return deduped.length >= 20 ? deduped : [];
}

function parseMetacriticBrowseCandidates(html, pageUrl) {
  const normalizedHtml = extractFragmentSectionHtml(html, pageUrl);

  if (!normalizedHtml || !/data-testid="filter-results"/i.test(normalizedHtml)) {
    return [];
  }

  const cardBlocks = normalizedHtml
    .split(/(?=<div\b[^>]*data-testid=["']filter-results["'][^>]*>)/gi)
    .filter((block) => /data-testid=["']filter-results["']/i.test(block));

  if (cardBlocks.length < 4) {
    return [];
  }

  const candidates = [];

  for (const block of cardBlocks) {
    const hrefMatch = block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    const titleMatch = block.match(
      /data-testid=["']product-title["'][^>]*>[\s\S]*?<span>\s*\d+\.\s*<\/span>\s*<span>([\s\S]*?)<\/span>/i
    );
    const fallbackTitleMatch = block.match(/data-title=["']([^"']+)["']/i);
    const imageTagMatch = block.match(/<img\b[^>]*data-nuxt-img[^>]*>/i);
    const metaLineMatch = block.match(
      /<div class="overflow-hidden text-ellipsis line-clamp-1[\s\S]*?>([\s\S]*?)<\/div>/i
    );
    const descriptionMatch = block.match(
      /<div class="overflow-hidden text-ellipsis line-clamp-2[\s\S]*?><span>([\s\S]*?)<\/span><\/div>/i
    );

    const label = normalizeLine(
      collapseWhitespace(stripHtmlTags(titleMatch?.[1] || fallbackTitleMatch?.[1] || ""))
    );

    if (!label) {
      continue;
    }

    const description = normalizeLine(
      collapseWhitespace(stripHtmlTags(descriptionMatch?.[1] || ""))
    );
    const metaLine = normalizeLine(collapseWhitespace(stripHtmlTags(metaLineMatch?.[1] || "")));

    candidates.push({
      label,
      description: description || metaLine || null,
      rationale: null,
      score: 1,
      imageUrl: imageTagMatch ? extractBestImageUrlFromTag(imageTagMatch[0], pageUrl) : null,
      sourceUrl: hrefMatch ? toAbsoluteUrl(hrefMatch[1], pageUrl) : pageUrl || null,
      sourceTitle: null,
      excerpt: null
    });
  }

  const deduped = dedupeCandidates(candidates);
  return deduped.length >= 4 ? deduped : [];
}

function parseTracklistRowCandidates(html, pageUrl) {
  const normalizedHtml = extractFragmentSectionHtml(html, pageUrl);

  if (!normalizedHtml || !/data-testid="tracklist-row"/i.test(normalizedHtml)) {
    return [];
  }

  const rowBlocks = normalizedHtml
    .split(/(?=<div\b[^>]*role=["']row["'][^>]*>)/gi)
    .filter((block) => /data-testid=["']tracklist-row["']/i.test(block));

  if (rowBlocks.length < 2) {
    return [];
  }

  const candidates = [];

  for (const rowHtml of rowBlocks) {
    const titleMatch = rowHtml.match(
      /data-testid="internal-track-link"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<\/a>/i
    );

    if (!titleMatch) {
      continue;
    }

    const label = normalizeLine(collapseWhitespace(stripHtmlTags(titleMatch[1])));
    if (!label) {
      continue;
    }

    const trackHrefMatch = rowHtml.match(/data-testid="internal-track-link"[^>]*href="([^"]+)"/i);
    const imageTagMatch = rowHtml.match(/<img\b[^>]*class="[^"]*\bobD7rdENNc2n3fC0\b[^"]*"[^>]*>/i);
    const artistLinks = [...rowHtml.matchAll(/<a\b[^>]*href="\/artist\/[^"]+"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => collapseWhitespace(stripHtmlTags(match[1])))
      .filter(Boolean);
    const albumMatch = rowHtml.match(/href="\/album\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i);
    const rankMatch = rowHtml.match(/<span\b[^>]*data-encore-id="text"[^>]*>\s*(\d+)\s*<\/span>/i);
    const descriptionParts = [];

    if (artistLinks.length > 0) {
      descriptionParts.push(artistLinks.join(", "));
    }

    if (albumMatch) {
      const albumTitle = collapseWhitespace(stripHtmlTags(albumMatch[1]));

      if (albumTitle) {
        descriptionParts.push(albumTitle);
      }
    }

    candidates.push({
      label,
      description: descriptionParts.join(" - ") || null,
      rationale: null,
      score: rankMatch ? Math.max(0, Math.min(1, 1 - Number(rankMatch[1]) / 1000)) : 1,
      imageUrl: imageTagMatch ? extractBestImageUrlFromTag(imageTagMatch[0], pageUrl) : null,
      sourceUrl: trackHrefMatch ? toAbsoluteUrl(trackHrefMatch[1], pageUrl) : pageUrl || null,
      sourceTitle: null,
      excerpt: null
    });
  }

  const deduped = dedupeCandidates(candidates);
  return deduped.length >= 2 ? deduped : [];
}

function buildImageHints(html, pageUrl) {
  const normalizedHtml = String(html || "");

  if (!normalizedHtml) {
    return [];
  }

  const matches = [...normalizedHtml.matchAll(/<img\b[^>]*>/gi)];
  const hints = [];
  const seen = new Set();

  for (const match of matches) {
    const index = match.index ?? 0;
    const block = normalizedHtml.slice(Math.max(0, index - 600), Math.min(normalizedHtml.length, index + 1200));
    const imageUrl = extractBestImageUrlFromTag(match[0], pageUrl);

    if (!imageUrl) {
      continue;
    }

    const anchorMatches = [...block.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
    const nearbyTitle = anchorMatches
      .map((anchor) => normalizeLine(collapseWhitespace(stripHtmlTags(anchor[1]))))
      .find((text) => text && /[a-z]/i.test(text) && text.length >= 3 && !/^remove$/i.test(text));

    if (!nearbyTitle) {
      continue;
    }

    const key = `${nearbyTitle.toLowerCase()}|${imageUrl}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    hints.push(`- ${nearbyTitle}: ${imageUrl}`);
  }

  return hints.slice(0, 80);
}

function buildHtmlImageAssociations(html, pageUrl) {
  const normalizedHtml = String(html || "");

  if (!normalizedHtml) {
    return [];
  }

  const associations = [];
  const seen = new Set();
  const imageMatches = [...normalizedHtml.matchAll(/<img\b[^>]*>/gi)];

  for (const match of imageMatches) {
    const index = match.index ?? 0;
    const imageUrl = extractBestImageUrlFromTag(match[0], pageUrl);

    if (!imageUrl) {
      continue;
    }

    const block = normalizedHtml.slice(
      Math.max(0, index - 900),
      Math.min(normalizedHtml.length, index + 1800)
    );
    const anchorMatches = [...block.matchAll(/<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

    for (const anchorMatch of anchorMatches) {
      const label = normalizeLine(collapseWhitespace(stripHtmlTags(anchorMatch[2])));
      const sourceUrl = toAbsoluteUrl(anchorMatch[1], pageUrl);

      if (!label || !/[a-z]/i.test(label) || label.length < 3 || /^remove$/i.test(label)) {
        continue;
      }

      const key = `${normalizeLookupKey(label)}|${imageUrl}|${sourceUrl || ""}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      associations.push({
        label,
        labelKey: normalizeLookupKey(label),
        imageUrl,
        sourceUrl
      });
    }
  }

  return associations;
}

function extractJsonLdImageAssociations(html, pageUrl) {
  const normalizedHtml = String(html || "");

  if (!normalizedHtml) {
    return [];
  }

  const associations = [];
  const seen = new Set();
  const scriptMatches = [
    ...normalizedHtml.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ];

  for (const [, scriptBody] of scriptMatches) {
    let parsed;

    try {
      parsed = JSON.parse(decodeHtmlEntities(scriptBody).trim());
    } catch {
      continue;
    }

    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.["@graph"])
        ? parsed["@graph"]
        : [parsed];

    for (const item of items) {
      const label = collapseWhitespace(item?.name || "");
      const sourceUrl = toAbsoluteUrl(item?.url || null, pageUrl);
      const imageUrl = toAbsoluteUrl(item?.image || null, pageUrl);

      if (!label || !imageUrl) {
        continue;
      }

      const key = `${normalizeLookupKey(label)}|${imageUrl}|${sourceUrl || ""}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      associations.push({
        label,
        labelKey: normalizeLookupKey(label),
        imageUrl,
        sourceUrl
      });
    }
  }

  return associations;
}

function enrichCandidatesFromHtml(candidates, html, pageUrl) {
  if (!html || !Array.isArray(candidates) || candidates.length === 0) {
    return candidates;
  }

  const associations = [
    ...extractJsonLdImageAssociations(html, pageUrl),
    ...buildHtmlImageAssociations(html, pageUrl)
  ];

  if (associations.length === 0) {
    return candidates;
  }

  const byLabel = new Map();
  const bySourceUrl = new Map();

  for (const association of associations) {
    if (!byLabel.has(association.labelKey)) {
      byLabel.set(association.labelKey, association);
    }

    if (association.sourceUrl && !bySourceUrl.has(association.sourceUrl)) {
      bySourceUrl.set(association.sourceUrl, association);
    }
  }

  return candidates.map((candidate) => {
    if (candidate.imageUrl) {
      return candidate;
    }

    const sourceMatch = candidate.sourceUrl ? bySourceUrl.get(candidate.sourceUrl) : null;
    const labelMatch = byLabel.get(normalizeLookupKey(candidate.label));
    const matchedAssociation = sourceMatch || labelMatch;

    if (!matchedAssociation?.imageUrl) {
      return candidate;
    }

    return {
      ...candidate,
      imageUrl: matchedAssociation.imageUrl
    };
  });
}

function finalizeStructuredCandidate(current) {
  if (!current?.label) {
    return null;
  }

  const description = collapseWhitespace(current.description || "");

  return {
    label: collapseWhitespace(current.label),
    description: description || null,
    rationale: null,
    score: 1,
    sourceUrl: current.sourceUrl || null,
    sourceTitle: null,
    excerpt: null
  };
}

function parseStructuredListCandidates(text) {
  const normalizedText = String(text || "").replace(/\r/g, "").trim();
  if (!normalizedText) {
    return [];
  }

  const blocks = normalizedText
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const blockParsed = blocks.map(parseStructuredListBlock).filter(Boolean);

  if (blockParsed.length >= STRUCTURED_LIST_MIN_ITEMS) {
    return dedupeCandidates(blockParsed);
  }

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  let current = null;

  for (const line of lines) {
    if (isUrlOnlyLine(line)) {
      if (current && !current.sourceUrl) {
        current.sourceUrl = extractUrlFromText(line);
      }
      continue;
    }

    const normalizedLine = normalizeLine(line);
    if (!normalizedLine) {
      continue;
    }

    const inlineUrl = extractUrlFromText(normalizedLine);
    const withoutInlineUrl = stripMarkdownLinkSyntax(normalizedLine);
    const separators = [" - ", " – ", " — ", ": "];
    let nextLabel = withoutInlineUrl;
    let nextDescription = "";

    for (const separator of separators) {
      if (withoutInlineUrl.includes(separator)) {
        const [left, ...rest] = withoutInlineUrl.split(separator);
        const possibleLabel = collapseWhitespace(left);
        const remainder = collapseWhitespace(rest.join(separator));

        if (possibleLabel && remainder) {
          nextLabel = possibleLabel;
          nextDescription = remainder;
          break;
        }
      }
    }

    const looksLikeNewItem =
      !current ||
      Boolean(nextDescription) ||
      current.sourceUrl ||
      current.description ||
      normalizedLine.length <= 140;

    if (looksLikeNewItem) {
      const finalized = finalizeStructuredCandidate(current);
      if (finalized) {
        parsed.push(finalized);
      }

      current = {
        label: nextLabel,
        description: nextDescription,
        sourceUrl: inlineUrl
      };
      continue;
    }

    current.description = [current.description, withoutInlineUrl].filter(Boolean).join(" ");
  }

  const finalized = finalizeStructuredCandidate(current);
  if (finalized) {
    parsed.push(finalized);
  }

  if (parsed.length >= STRUCTURED_LIST_MIN_ITEMS) {
    return dedupeCandidates(parsed);
  }

  return [];
}

function splitTextIntoChunks(text) {
  const normalizedText = String(text || "").replace(/\r/g, "").trim();

  if (!normalizedText) {
    return [];
  }

  if (normalizedText.length <= CHUNK_TEXT_THRESHOLD) {
    return [normalizedText];
  }

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length <= CHUNK_LINE_LIMIT) {
    return [normalizedText];
  }

  const chunks = [];

  for (let index = 0; index < lines.length; index += CHUNK_LINE_LIMIT) {
    const chunk = lines.slice(index, index + CHUNK_LINE_LIMIT).join("\n").trim();
    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks.length > 0 ? chunks : [normalizedText];
}

function extractOutputText(payload) {
  const blocks = payload?.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((content) => content.type === "text");
  const text = blocks?.map((block) => block.text || "").join("\n").trim();

  if (!text) {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  return text;
}

function extractUrlCitations(payload) {
  const citations = [];
  const seen = new Set();
  const blocks = payload?.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((content) => content.type === "text");

  for (const block of blocks || []) {
    for (const annotation of block.annotations || []) {
      if (annotation.type !== "url_citation" || !annotation.url || seen.has(annotation.url)) {
        continue;
      }

      seen.add(annotation.url);
      citations.push({
        url: annotation.url,
        title: annotation.title || null
      });
    }
  }

  return citations;
}

function normalizeCandidates(value) {
  if (!Array.isArray(value?.candidates)) {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  return value.candidates
    .map((candidate) => {
      const label = normalizeLine(String(candidate.label || "").trim());
      const rationale = candidate.rationale ? String(candidate.rationale).trim() : null;
      const excerpt = candidate.excerpt ? String(candidate.excerpt).trim() : null;

      return {
        label,
        description: deriveCandidateDescription({ label, rationale, excerpt }),
        rationale,
        score:
          typeof candidate.score === "number" && Number.isFinite(candidate.score)
            ? Math.max(0, Math.min(1, candidate.score))
            : null,
        imageUrl: candidate.imageUrl ? String(candidate.imageUrl).trim() : null,
        sourceUrl: candidate.sourceUrl ? String(candidate.sourceUrl).trim() : null,
        sourceTitle: candidate.sourceTitle ? String(candidate.sourceTitle).trim() : null,
        excerpt
      };
    })
    .filter((candidate) => candidate.label);
}

async function requestGeminiExtraction({ apiKey, model, prompt, text, html, urls, pageUrl }) {
  const requestBody = {
    model: model || DEFAULT_MODEL,
    input: buildPrompt({ prompt, text, html, urls, pageUrl }),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: candidatePoolSchema
    },
    store: false,
    ...(urls.length > 0 ? { tools: [{ type: "url_context" }] } : {})
  };

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error("GEMINI_UNAVAILABLE");
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  return {
    candidates: normalizeCandidates(parsed),
    citations: extractUrlCitations(payload),
    model: payload.model || requestBody.model
  };
}

export async function extractCandidatesWithGeminiForPools({
  prompt,
  text = null,
  html = null,
  urls = [],
  model,
  pageUrl = null
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }

  if (text && !html && urls.length === 0) {
    const structuredCandidates = parseStructuredListCandidates(text);

    if (structuredCandidates.length >= STRUCTURED_LIST_MIN_ITEMS) {
      return {
        candidates: structuredCandidates,
        citations: [],
        model: "structured-list-parser"
      };
    }
  }

  if (html) {
    const tracklistCandidates = parseTracklistRowCandidates(html, pageUrl);

    if (tracklistCandidates.length >= 10) {
      return {
        candidates: enrichCandidatesFromHtml(tracklistCandidates, html, pageUrl),
        citations: [],
        model: "tracklist-row-parser"
      };
    }

    const billboardCandidates = parseBillboardGalleryCandidates(html, pageUrl);

    if (billboardCandidates.length >= 20) {
      return {
        candidates: enrichCandidatesFromHtml(billboardCandidates, html, pageUrl),
        citations: [],
        model: "billboard-gallery-parser"
      };
    }

    const metacriticCandidates = parseMetacriticBrowseCandidates(html, pageUrl);

    if (metacriticCandidates.length >= 4) {
      return {
        candidates: enrichCandidatesFromHtml(metacriticCandidates, html, pageUrl),
        citations: [],
        model: "metacritic-browse-parser"
      };
    }

    const tableCandidates = parseHtmlTableCandidates(html, pageUrl);

    if (tableCandidates.length >= 8) {
      return {
        candidates: enrichCandidatesFromHtml(tableCandidates, html, pageUrl),
        citations: [],
        model: "html-table-parser"
      };
    }

    const htmlCandidates = parseHtmlCardCandidates(html, pageUrl);

    if (htmlCandidates.length >= 4) {
      return {
        candidates: enrichCandidatesFromHtml(htmlCandidates, html, pageUrl),
        citations: [],
        model: "html-card-parser"
      };
    }
  }

  const textChunks = text && !html && urls.length === 0 ? splitTextIntoChunks(text) : [];

  if (textChunks.length > 1) {
    const batchResults = [];

    for (const [index, chunk] of textChunks.entries()) {
      batchResults.push(
        await requestGeminiExtraction({
          apiKey,
          model,
          prompt: `${prompt}\nProcess chunk ${index + 1} of ${textChunks.length}. Be exhaustive within this chunk.`,
          text: chunk,
          html: null,
          urls: [],
          pageUrl
        })
      );
    }

    return {
      candidates: dedupeCandidates(batchResults.flatMap((result) => result.candidates)),
      citations: batchResults.flatMap((result) => result.citations),
      model: batchResults[0]?.model || model || DEFAULT_MODEL
    };
  }

  const result = await requestGeminiExtraction({
    apiKey,
    model,
    prompt,
    text,
    html,
    urls,
    pageUrl
  });

  return {
    ...result,
    candidates: dedupeCandidates(enrichCandidatesFromHtml(result.candidates, html, pageUrl))
  };
}
