const OPENVERSE_API_URL = "https://api.openverse.engineering/v1/images/";
const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const FLICKR_PUBLIC_FEED_URL = "https://www.flickr.com/services/feeds/photos_public.gne";
const MAX_RESULTS = 12;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreSuggestion(query, item) {
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(item.title);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedTokens = queryTokens.filter((token) => normalizedTitle.includes(token)).length;
  const sourceWeight =
    item.source === "Wikipedia"
      ? 40
      : item.source === "Wikimedia Commons"
        ? 25
        : item.source === "Openverse"
          ? 15
          : 5;

  let score = sourceWeight;

  if (normalizedTitle === normalizedQuery) {
    score += 200;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 120;
  }

  if (queryTokens.length > 0) {
    score += Math.round((matchedTokens / queryTokens.length) * 80);
  }

  if (item.thumbnailUrl) {
    score += 20;
  }

  if (normalizedTitle.includes("soundtrack") || normalizedTitle.includes("song")) {
    score += 10;
  }

  return score;
}

function normalizeSuggestionUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "api.openverse.org") {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function buildQueryVariants(query) {
  const trimmed = query.trim();
  const variants = [
    trimmed,
    `${trimmed} film`,
    `${trimmed} movie`,
    `${trimmed} animated film`,
    `${trimmed} disney`,
    `${trimmed} pixar`
  ];
  const withoutGameSuffix = trimmed.replace(/\b(board game|game)\b/gi, "").replace(/\s+/g, " ").trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (withoutGameSuffix && withoutGameSuffix.toLowerCase() !== trimmed.toLowerCase()) {
    variants.push(withoutGameSuffix);
    variants.push(`${withoutGameSuffix} film`);
    variants.push(`${withoutGameSuffix} movie`);
    variants.push(`${withoutGameSuffix} animated film`);
    variants.push(`${withoutGameSuffix} disney`);
    variants.push(`${withoutGameSuffix} pixar`);
  }

  if (words.length >= 3) {
    variants.push(words.slice(0, 3).join(" "));
  }

  if (words.length >= 2) {
    variants.push(words.slice(0, 2).join(" "));
  }

  return [...new Set(variants.filter(Boolean))];
}

function dedupeItems(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = item.imageUrl || item.thumbnailUrl || item.title;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

async function searchOpenverse(query) {
  const response = await fetch(`${OPENVERSE_API_URL}?q=${encodeURIComponent(query)}&page_size=${MAX_RESULTS}`, {
    headers: {
      accept: "application/json"
    },
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return (payload.results ?? [])
    .map((item) => {
      const imageUrl = normalizeSuggestionUrl(item.url);
      const thumbnailUrl = normalizeSuggestionUrl(item.thumbnail) || imageUrl;

      if (!imageUrl) {
        return null;
      }

      return {
        id: `openverse:${item.id}`,
        title: item.title || item.foreign_landing_url || "Suggested image",
        imageUrl,
        thumbnailUrl,
        creator: item.creator || null,
        license: item.license || null,
        source: item.source || "Openverse"
      };
    })
    .filter(Boolean);
}

async function searchWikimediaCommons(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(MAX_RESULTS),
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "500",
    origin: "*"
  });

  const response = await fetch(`${COMMONS_API_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json"
    },
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const pages = Object.values(payload.query?.pages ?? {});

  return pages
    .map((page) => {
      const imageinfo = page.imageinfo?.[0];
      if (!imageinfo?.url) {
        return null;
      }

      return {
        id: `commons:${page.pageid}`,
        title: String(page.title || "Suggested image").replace(/^File:/, ""),
        imageUrl: normalizeSuggestionUrl(imageinfo.url),
        thumbnailUrl: normalizeSuggestionUrl(imageinfo.thumburl) || normalizeSuggestionUrl(imageinfo.url),
        creator: null,
        license: null,
        source: "Wikimedia Commons"
      };
    })
    .filter((item) => item?.imageUrl);
}

async function searchWikipediaPages(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "0",
    gsrlimit: String(MAX_RESULTS),
    prop: "pageimages",
    piprop: "original|thumbnail",
    pithumbsize: "600",
    origin: "*"
  });

  const response = await fetch(`${WIKIPEDIA_API_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json"
    },
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const pages = Object.values(payload.query?.pages ?? {});

  return pages
    .map((page) => {
      const imageUrl = normalizeSuggestionUrl(page.original?.source || page.thumbnail?.source);
      const thumbnailUrl = normalizeSuggestionUrl(page.thumbnail?.source) || normalizeSuggestionUrl(page.original?.source);

      if (!imageUrl) {
        return null;
      }

      return {
        id: `wikipedia:${page.pageid}`,
        title: String(page.title || query || "Suggested image"),
        imageUrl,
        thumbnailUrl,
        creator: null,
        license: null,
        source: "Wikipedia"
      };
    })
    .filter(Boolean);
}

async function searchWikipediaExactTitle(title) {
  const trimmed = title.trim();

  if (!trimmed) {
    return [];
  }

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles: trimmed,
    prop: "pageimages",
    piprop: "original|thumbnail",
    pithumbsize: "600",
    redirects: "1",
    origin: "*"
  });

  const response = await fetch(`${WIKIPEDIA_API_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json"
    },
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const pages = Object.values(payload.query?.pages ?? {});

  return pages
    .map((page) => {
      if (page.missing !== undefined) {
        return null;
      }

      const imageUrl = normalizeSuggestionUrl(page.original?.source || page.thumbnail?.source);
      const thumbnailUrl = normalizeSuggestionUrl(page.thumbnail?.source) || normalizeSuggestionUrl(page.original?.source);

      if (!imageUrl) {
        return null;
      }

      return {
        id: `wikipedia-exact:${page.pageid}`,
        title: String(page.title || trimmed || "Suggested image"),
        imageUrl,
        thumbnailUrl,
        creator: null,
        license: null,
        source: "Wikipedia"
      };
    })
    .filter(Boolean);
}

async function searchFlickrPublic(query) {
  const tags = query
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(",");

  if (!tags) {
    return [];
  }

  const params = new URLSearchParams({
    format: "json",
    nojsoncallback: "1",
    lang: "en-us",
    tags
  });

  const response = await fetch(`${FLICKR_PUBLIC_FEED_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json"
    },
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();

  return (payload.items ?? [])
    .slice(0, MAX_RESULTS)
    .map((item, index) => {
      const imageUrl = normalizeSuggestionUrl(item.media?.m);
      const title = String(item.title || query || "Suggested image").trim();

      if (!imageUrl) {
        return null;
      }

      return {
        id: `flickr:${tags}:${index}`,
        title,
        imageUrl,
        thumbnailUrl: imageUrl,
        creator: item.author || null,
        license: null,
        source: "Flickr"
      };
    })
    .filter(Boolean);
}

export function isStrongSuggestedImageMatch(candidateName, suggestion) {
  const normalizedCandidateName = normalizeText(candidateName);
  const normalizedTitle = normalizeText(suggestion?.title);

  if (!normalizedCandidateName || !normalizedTitle) return false;
  if (normalizedTitle === normalizedCandidateName || normalizedTitle.includes(normalizedCandidateName)) return true;

  const nameTokens = normalizedCandidateName.split(/\s+/).filter(Boolean);
  if (nameTokens.length === 0) return false;

  const matchedTokenCount = nameTokens.filter((token) => normalizedTitle.includes(token)).length;
  const isTrustedSource = suggestion?.source === "Wikipedia" || suggestion?.source === "Wikimedia Commons";
  return isTrustedSource && matchedTokenCount === nameTokens.length;
}

export async function searchImageSuggestions(query) {
  const trimmed = String(query || "").trim();

  if (trimmed.length < 2) {
    return [];
  }

  const variants = buildQueryVariants(trimmed);
  const collected = [];
  const exactTitleVariants = [
    trimmed,
    `${trimmed} (film)`,
    `${trimmed} (movie)`,
    `${trimmed} (1989 film)`,
    `${trimmed} (2023 film)`,
    `${trimmed} (2015 film)`,
    `${trimmed} (2024 film)`
  ];

  for (const exactVariant of [...new Set(exactTitleVariants)]) {
    const exactItems = await searchWikipediaExactTitle(exactVariant);
    collected.push(...exactItems);

    if (dedupeItems(collected).length >= MAX_RESULTS) {
      break;
    }
  }

  for (const variant of variants) {
    if (dedupeItems(collected).length >= MAX_RESULTS) {
      break;
    }

    const [wikipediaItems, commonsItems, openverseItems, flickrItems] = await Promise.all([
      searchWikipediaPages(variant),
      searchWikimediaCommons(variant),
      searchOpenverse(variant),
      searchFlickrPublic(variant)
    ]);

    collected.push(...wikipediaItems, ...commonsItems, ...openverseItems, ...flickrItems);

    if (dedupeItems(collected).length >= MAX_RESULTS) {
      break;
    }
  }

  return dedupeItems(collected)
    .filter((item) => item.thumbnailUrl || item.imageUrl)
    .sort((left, right) => scoreSuggestion(trimmed, right) - scoreSuggestion(trimmed, left))
    .slice(0, MAX_RESULTS);
}
