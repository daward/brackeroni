"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function buildBookmarkletHref(origin, poolId = null, poolName = null) {
  const script = `
 (async () => {
 const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const BRIDGE_URL = ${JSON.stringify(`${origin}/import/bridge`)};
  const BRIDGE_ORIGIN = new URL(BRIDGE_URL).origin;
  const IMPORT_PAYLOAD_MESSAGE_TYPE = "BRACKERONI_IMPORT_PAYLOAD";
  const IMPORT_READY_MESSAGE_TYPE = "BRACKERONI_IMPORT_READY";
  const bridgeWindow = window.open("", "_blank");
  try {
    window.focus();
  } catch {}
  const MAX_HTML_CHARS = 180000;
  const MAX_TEXT_CHARS = 90000;
  const MAX_CAPTURED_ITEMS = 240;

  function findScrollableAncestor(element) {
    let current = element?.parentElement || null;

    while (current) {
      if (current.scrollHeight > current.clientHeight + 40) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function scrollTopOf(target) {
    return target === window ? window.scrollY : target.scrollTop;
  }

  function scrollHeightOf(target) {
    return target === window
      ? Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)
      : target.scrollHeight;
  }

  function clientHeightOf(target) {
    return target === window ? window.innerHeight : target.clientHeight;
  }

  function setScrollTop(target, value) {
    if (target === window) {
      window.scrollTo(0, value);
    } else {
      target.scrollTop = value;
      target.dispatchEvent(new Event('scroll', { bubbles: true }));
    }
  }

  function getScrollTargets(grid) {
    const targets = [];
    const addTarget = (target) => {
      if (target && !targets.includes(target) && scrollHeightOf(target) > clientHeightOf(target) + 40) {
        targets.push(target);
      }
    };

    let current = grid?.parentElement || null;
    while (current) {
      addTarget(current);
      current = current.parentElement;
    }

    addTarget(document.querySelector('[data-overlayscrollbars-viewport]'));
    addTarget(document.scrollingElement || document.documentElement);
    addTarget(window);

    return targets;
  }

  async function hydrateDocumentScroll() {
    const scrollTarget = document.scrollingElement || document.documentElement;
    const originalTop = scrollTopOf(window);
    let stablePasses = 0;
    let previousHeight = scrollHeightOf(window);

    setScrollTop(window, 0);
    await wait(180);

    for (let iteration = 0; iteration < 28; iteration += 1) {
      const nextScrollTop = Math.min(
        scrollTopOf(window) + Math.max(420, clientHeightOf(window) * 0.9),
        Math.max(scrollHeightOf(window) - clientHeightOf(window), 0)
      );

      setScrollTop(window, nextScrollTop);
      await wait(220);

      const nextHeight = scrollHeightOf(window);
      const atBottom =
        scrollTopOf(window) + clientHeightOf(window) >= nextHeight - 24;

      if (nextHeight === previousHeight && atBottom) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
        previousHeight = nextHeight;
      }

      if (stablePasses >= 3) {
        break;
      }
    }

    setScrollTop(window, originalTop);
    scrollTarget.dispatchEvent(new Event('scroll', { bubbles: true }));
    await wait(120);
  }

  function captureGridRows(grid, seenRows) {
    const rows = [
      ...grid.querySelectorAll('[role="row"]'),
      ...grid.querySelectorAll('[role="listitem"]'),
      ...grid.children
    ];

    for (const row of rows) {
      const rowHost = row.closest('[role="row"]') || row.parentElement || row;
      const rowIndex = rowHost?.getAttribute('aria-rowindex') || row.getAttribute('aria-rowindex') || "";
      const primaryLink = row.querySelector('a[href]') || rowHost?.querySelector?.('a[href]');
      const identity =
        primaryLink?.getAttribute('href') ||
        cardIdentityFromElement(rowHost) ||
        row.textContent?.trim() ||
        "";
      const key = rowIndex || identity;

      if (!key || seenRows.has(key)) {
        continue;
      }

      const compactHtml = compactCardHtml(rowHost);
      if (!compactHtml) {
        continue;
      }

      seenRows.set(key, {
        html: compactHtml,
        identity
      });
    }
  }

  function compareOrderedKeys(leftKey, rightKey) {
    const leftNumber = Number(leftKey);
    const rightNumber = Number(rightKey);

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }

    return String(leftKey).localeCompare(String(rightKey));
  }

  function findSelectionSliceBounds(items, identitySelector) {
    const selectionState = window.__brackeroniSelectionState || null;
    const selectedIdentities = selectionState?.identities || [];

    if (!selectedIdentities.length) {
      return null;
    }

    const matchedIndexes = items
      .map((item, index) => (selectedIdentities.includes(identitySelector(item)) ? index : -1))
      .filter((index) => index >= 0);

    if (!matchedIndexes.length) {
      return null;
    }

    return {
      startIndex: matchedIndexes[0],
      endIndex: matchedIndexes[matchedIndexes.length - 1] + 1
    };
  }

  function summarizeSelectionState(selectionState) {
    const identities = selectionState?.identities || [];

    return {
      identityCount: identities.length,
      firstIdentity: identities[0] || null,
      lastIdentity: identities[identities.length - 1] || null
    };
  }

  async function collectVirtualizedGridHtml(resumeState = null) {
    const grids = [...document.querySelectorAll('[role="grid"][aria-rowcount], [role="list"][aria-setsize], [role="feed"]')]
      .sort(
        (left, right) =>
          Number(right.getAttribute('aria-rowcount') || right.getAttribute('aria-setsize') || 0) -
          Number(left.getAttribute('aria-rowcount') || left.getAttribute('aria-setsize') || 0)
      );
    const grid = grids[0];
    if (!grid) {
      return "";
    }

    const expectedRowCount = Number(grid.getAttribute('aria-rowcount') || grid.getAttribute('aria-setsize') || 0);
    if (!Number.isFinite(expectedRowCount) || expectedRowCount < 20) {
      return "";
    }

    const scrollTargets = getScrollTargets(grid);
    if (scrollTargets.length === 0) {
      return "";
    }

    const seenRows = new Map();
    const originals = scrollTargets.map((target) => [target, scrollTopOf(target)]);

    for (const scrollTarget of scrollTargets) {
      let stablePasses = 0;
      let previousSeenCount = seenRows.size;

      setScrollTop(scrollTarget, 0);
      await wait(180);

      for (let iteration = 0; iteration < 100; iteration += 1) {
        captureGridRows(grid, seenRows);

        if (seenRows.size >= expectedRowCount - 1) {
          break;
        }

        if (seenRows.size === previousSeenCount) {
          stablePasses += 1;
        } else {
          stablePasses = 0;
          previousSeenCount = seenRows.size;
        }

        if (stablePasses >= 8) {
          break;
        }

        const nextScrollTop = Math.min(
          scrollTopOf(scrollTarget) + Math.max(280, clientHeightOf(scrollTarget) * 0.7),
          scrollHeightOf(scrollTarget)
        );

        setScrollTop(scrollTarget, nextScrollTop);
        await wait(180);
      }

      if (seenRows.size >= expectedRowCount - 1) {
        break;
      }
    }

    for (const [target, scrollTop] of originals) {
      setScrollTop(target, scrollTop);
    }

    if (seenRows.size < 2) {
      return "";
    }

    const orderedEntries = [...seenRows.entries()]
      .sort((left, right) => compareOrderedKeys(left[0], right[0]));

    let startIndex = 0;
    let endIndex = Math.min(orderedEntries.length, MAX_CAPTURED_ITEMS);

    const selectedSlice = findSelectionSliceBounds(
      orderedEntries,
      (entry) => entry?.[1]?.identity || ""
    );
    if (selectedSlice) {
      startIndex = selectedSlice.startIndex;
      endIndex = Math.min(selectedSlice.endIndex, selectedSlice.startIndex + MAX_CAPTURED_ITEMS);
    }

    if (resumeState?.mode === "virtualized-grid") {
      const resumeIndex = resumeState.lastKey
        ? orderedEntries.findIndex((entry) => entry[0] === resumeState.lastKey)
        : -1;

      if (resumeIndex >= 0) {
        startIndex = resumeIndex + 1;
        endIndex = Math.min(orderedEntries.length, startIndex + MAX_CAPTURED_ITEMS);
      } else if (Number.isFinite(resumeState.emittedCount) && resumeState.emittedCount > 0) {
        startIndex = Math.min(resumeState.emittedCount, orderedEntries.length);
        endIndex = Math.min(orderedEntries.length, startIndex + MAX_CAPTURED_ITEMS);
      }
    }

    const emittedEntries = orderedEntries.slice(startIndex, endIndex);
    if (emittedEntries.length < 1) {
      return {
        html: "",
        cursor: null,
        debug: {
          mode: "virtualized-grid",
          expectedRowCount,
          hydratedCount: orderedEntries.length,
          selectedSliceStart: selectedSlice?.startIndex ?? null,
          selectedSliceEnd: selectedSlice?.endIndex ?? null,
          startIndex,
          endIndex,
          emittedCount: 0
        }
      };
    }

    return {
      html: \`<div data-brackeroni-captured-grid="true" data-rowcount="\${expectedRowCount}">\${emittedEntries.map((entry) => entry[1].html).join("")}</div>\`,
      cursor: {
        mode: "virtualized-grid",
        lastKey: emittedEntries[emittedEntries.length - 1][0],
        lastItem: extractCardSummaryFromHtml(
          emittedEntries[emittedEntries.length - 1][1].html
        ),
        lastTitle:
          extractCardSummaryFromHtml(emittedEntries[emittedEntries.length - 1][1].html).title ||
          emittedEntries[emittedEntries.length - 1][0],
        emittedCount: startIndex + emittedEntries.length
      },
      debug: {
        mode: "virtualized-grid",
        expectedRowCount,
        hydratedCount: orderedEntries.length,
        selectedSliceStart: selectedSlice?.startIndex ?? null,
        selectedSliceEnd: selectedSlice?.endIndex ?? null,
        startIndex,
        endIndex,
        emittedCount: emittedEntries.length,
        firstIdentity: emittedEntries[0]?.[1]?.identity || null,
        lastIdentity: emittedEntries[emittedEntries.length - 1]?.[1]?.identity || null
      }
    };
  }

  function collapseWhitespace(value) {
    return String(value || "").replace(/\\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function compactText(value, maxLength = MAX_TEXT_CHARS) {
    const normalized = collapseWhitespace(value);
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  function isLikelyNoiseMetadata(value) {
    const normalized = collapseWhitespace(value);

    if (!normalized) {
      return true;
    }

    if (normalized.length > 96) {
      return true;
    }

    if (/^\\d+(\\.\\d+)?$/.test(normalized)) {
      return true;
    }

    if (/^\\(?\\d[\\d,]*\\)?$/.test(normalized)) {
      return true;
    }

    if (/^\\d(\\.\\d)?\\s+of\\s+5\\s+bubbles$/i.test(normalized)) {
      return true;
    }

    if (/^(image|photos?|reviews?)$/i.test(normalized)) {
      return true;
    }

    if (/^by\\s+/i.test(normalized)) {
      return true;
    }

    return false;
  }

  function collectCardMetadata(element, title) {
    if (!element) {
      return [];
    }

    const normalizedTitle = collapseWhitespace(title).toLowerCase();
    const seen = new Set();
    const metadata = [];

    for (const node of element.querySelectorAll("span, div, p, li")) {
      const value = collapseWhitespace(node.textContent);
      const normalized = value.toLowerCase();

      if (!value || normalized === normalizedTitle || seen.has(normalized)) {
        continue;
      }

      if (isLikelyNoiseMetadata(value)) {
        continue;
      }

      if (
        value.split(" ").length <= 12 ||
        /(?:tickets?|tours?|from\\s+\\$|open now|closed now|traveler|choice|award|museum|landmark|park|bridge|show|food|midtown|manhattan|brooklyn)/i.test(
          value
        )
      ) {
        seen.add(normalized);
        metadata.push(value);
      }

      if (metadata.length >= 8) {
        break;
      }
    }

    return metadata;
  }

  function normalizeImageCandidate(value) {
    const normalized = collapseWhitespace(value);

    if (!normalized) {
      return "";
    }

    if (/^data:image\\//i.test(normalized)) {
      return "";
    }

    if (/^blob:/i.test(normalized)) {
      return "";
    }

    if (/^\\/\\//.test(normalized)) {
      return window.location.protocol + normalized;
    }

    return normalized;
  }

  function extractBestSrcsetCandidate(value) {
    const candidates = String(value || "")
      .split(",")
      .map((entry) => collapseWhitespace(entry))
      .map((entry) => {
        const parts = entry.split(/\\s+/).filter(Boolean);

        return {
          url: normalizeImageCandidate(parts[0] || ""),
          weight: Number((parts[1] || "").replace(/[^\\d.]/g, "")) || 0
        };
      })
      .filter((candidate) => candidate.url);

    if (candidates.length === 0) {
      return "";
    }

    candidates.sort((left, right) => right.weight - left.weight);
    return candidates[0].url;
  }

  function extractImageUrl(element) {
    if (!element) {
      return "";
    }

    const image = element.querySelector("img");
    const imageCandidates = [
      extractBestSrcsetCandidate(image?.getAttribute?.("srcset")),
      extractBestSrcsetCandidate(image?.getAttribute?.("data-thumb-srcset")),
      extractBestSrcsetCandidate(image?.getAttribute?.("data-srcset")),
      normalizeImageCandidate(image?.currentSrc),
      normalizeImageCandidate(image?.getAttribute?.("src")),
      normalizeImageCandidate(image?.getAttribute?.("data-thumb")),
      normalizeImageCandidate(image?.getAttribute?.("data-thumb-url")),
      normalizeImageCandidate(image?.getAttribute?.("data-src")),
      normalizeImageCandidate(image?.getAttribute?.("data-lazy-src")),
      normalizeImageCandidate(image?.getAttribute?.("data-delayed-url")),
      normalizeImageCandidate(image?.getAttribute?.("data-url"))
    ].filter(Boolean);

    if (imageCandidates.length > 0) {
      return imageCandidates[0];
    }

    const backgroundNode = element.querySelector("[style*='background-image']");
    const backgroundImageValue = backgroundNode?.style?.backgroundImage || "";
    const backgroundImageMatch = backgroundImageValue.match(/url\\((['"]?)(.*?)\\1\\)/i);

    if (backgroundImageMatch?.[2]) {
      return normalizeImageCandidate(backgroundImageMatch[2]);
    }

    return "";
  }

  function inferYouTubeThumbnailFromHref(href) {
    const rawHref = collapseWhitespace(href);

    if (!rawHref) {
      return "";
    }

    try {
      const url = new URL(rawHref, window.location.href);
      let host = url.hostname.toLowerCase();

      if (host.startsWith("www.")) {
        host = host.slice(4);
      }

      if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") {
        return "";
      }

      let videoId = "";

      if (host === "youtu.be") {
        let pathValue = url.pathname || "";

        while (pathValue.startsWith("/")) {
          pathValue = pathValue.slice(1);
        }

        videoId = pathValue.split("/")[0] || "";
      } else if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] || "";
      }

      videoId = collapseWhitespace(videoId);

      if (!videoId) {
        return "";
      }

      return "https://i.ytimg.com/vi/" + encodeURIComponent(videoId) + "/hqdefault.jpg";
    } catch {
      return "";
    }
  }

  function compactCardHtml(element) {
    if (!element) {
      return "";
    }

    const link = element.querySelector("a[href]");
    const image = element.querySelector("img");
    const titleNode =
      element.querySelector("h1, h2, h3, h4") ||
      element.querySelector("[title]") ||
      link;

    const title =
      collapseWhitespace(titleNode?.getAttribute("title")) ||
      collapseWhitespace(titleNode?.getAttribute("aria-label")) ||
      collapseWhitespace(link?.getAttribute("title")) ||
      collapseWhitespace(link?.getAttribute("aria-label")) ||
      collapseWhitespace(titleNode?.textContent) ||
      collapseWhitespace(link?.textContent);

    if (!title) {
      return "";
    }

    const href = collapseWhitespace(link?.getAttribute("href"));
    const imageUrl = extractImageUrl(element) || inferYouTubeThumbnailFromHref(href);
    const metadata = collectCardMetadata(element, title)
      .join(" • ");

    return [
      '<article data-brackeroni-card="true">',
      href ? \`<a href="\${escapeHtml(href)}">\` : "<div>",
      imageUrl ? \`<img src="\${escapeHtml(imageUrl)}" alt="" />\` : "",
      \`<h3>\${escapeHtml(title)}</h3>\`,
      metadata ? \`<p>\${escapeHtml(metadata)}</p>\` : "",
      href ? "</a>" : "</div>",
      "</article>"
    ].join("");
  }

  function extractCardSummaryFromHtml(html) {
    const safeHtml = String(html || "");
    const container = document.createElement("div");
    container.innerHTML = safeHtml;

    const link = container.querySelector("a[href]");
    const image = container.querySelector("img");
    const titleNode = container.querySelector("h3");
    const metadataNode = container.querySelector("p");

    return {
      href: collapseWhitespace(link?.getAttribute("href")) || null,
      imageUrl:
        extractImageUrl(container) ||
        inferYouTubeThumbnailFromHref(collapseWhitespace(link?.getAttribute("href"))) ||
        null,
      title: collapseWhitespace(titleNode?.textContent) || null,
      metadata: collapseWhitespace(metadataNode?.textContent) || null
    };
  }

  function cardTitleFromElement(element) {
    if (!element) {
      return "";
    }

    const titleNode =
      element.querySelector("h1, h2, h3, h4") ||
      element.querySelector("[title]") ||
      element.querySelector("a[href]");

    return (
      collapseWhitespace(titleNode?.getAttribute("title")) ||
      collapseWhitespace(titleNode?.getAttribute("aria-label")) ||
      collapseWhitespace(titleNode?.textContent)
    );
  }

  function cardIdentityFromElement(element) {
    if (!element) {
      return "";
    }

    const link = collapseWhitespace(element.querySelector("a[href]")?.getAttribute("href"));
    if (link) {
      return link;
    }

    const titleNode =
      element.querySelector("h1, h2, h3, h4") ||
      element.querySelector("[title]") ||
      element.querySelector("a[href]");
    const title =
      collapseWhitespace(titleNode?.getAttribute("title")) ||
      collapseWhitespace(titleNode?.getAttribute("aria-label")) ||
      collapseWhitespace(titleNode?.textContent);

    return title;
  }

  function collectRepeatedItemHtml(root, maxItems = MAX_CAPTURED_ITEMS, resumeState = null) {
    if (!root) {
      return {
        html: "",
        cursor: null
      };
    }

    const selectors = [
      "article",
      '[role="listitem"]',
      '[role="row"]',
      '[class*="card"]',
      '[class*="tile"]',
      '[class*="item"]',
      '[class*="entry"]',
      '[class*="result"]',
      "li"
    ];

    let bestHtml = "";
    let bestUniqueCount = 0;
    let bestCursor = null;
    let bestDebug = null;

    const preferredSelector = resumeState?.mode === "repeated-list" ? resumeState.selector : null;
    const orderedSelectors = preferredSelector
      ? [preferredSelector, ...selectors.filter((selector) => selector !== preferredSelector)]
      : selectors;
    const selectionIdentityCount = window.__brackeroniSelectionState?.identities?.length || 0;
    const shouldScanFullSelection = selectionIdentityCount > 0;

    for (const selector of orderedSelectors) {
      const items = [...root.querySelectorAll(selector)]
        .filter((item) => collapseWhitespace(item.textContent).length > 0)
        .slice(0, shouldScanFullSelection ? 5000 : Math.max(maxItems * 3, maxItems));

      if (items.length >= 4) {
        const seen = new Set();
        const uniqueItems = [];

        for (const item of items) {
          const identity = cardIdentityFromElement(item);

          if (!identity || seen.has(identity)) {
            continue;
          }

          const html = compactCardHtml(item);
          if (!html) {
            continue;
          }

          seen.add(identity);
          uniqueItems.push({
            identity,
            title: cardTitleFromElement(item) || identity,
            href: collapseWhitespace(item.querySelector("a[href]")?.getAttribute("href")) || null,
            imageUrl:
              collapseWhitespace(item.querySelector("img")?.getAttribute("src")) ||
              collapseWhitespace(item.querySelector("img")?.getAttribute("data-thumb")) ||
              collapseWhitespace(item.querySelector("img")?.getAttribute("data-src")) ||
              collapseWhitespace(item.querySelector("img")?.currentSrc) ||
              null,
            metadata:
              collectCardMetadata(item, cardTitleFromElement(item) || identity)
                .join(" • ") || null,
            html
          });
        }

        let startIndex = 0;
        let endIndex = Math.min(uniqueItems.length, maxItems);

        const selectedSlice = findSelectionSliceBounds(
          uniqueItems,
          (item) => item?.identity || ""
        );
        if (selectedSlice) {
          startIndex = selectedSlice.startIndex;
          endIndex = Math.min(selectedSlice.endIndex, selectedSlice.startIndex + maxItems);
        }

        if (preferredSelector && selector === preferredSelector) {
          const resumeIndex = resumeState?.lastKey
            ? uniqueItems.findIndex((item) => item.identity === resumeState.lastKey)
            : -1;

          if (resumeIndex >= 0) {
            startIndex = resumeIndex + 1;
            endIndex = Math.min(uniqueItems.length, startIndex + maxItems);
          } else if (Number.isFinite(resumeState?.emittedCount) && resumeState.emittedCount > 0) {
            startIndex = Math.min(resumeState.emittedCount, uniqueItems.length);
            endIndex = Math.min(uniqueItems.length, startIndex + maxItems);
          }
        }

        const emittedItems = uniqueItems.slice(startIndex, endIndex);

        if (preferredSelector && selector === preferredSelector && emittedItems.length > 0) {
          return {
            html: \`<div data-brackeroni-captured-list="true" data-selector="\${selector}">\${emittedItems.map((item) => item.html).join("")}</div>\`,
            cursor: {
              mode: "repeated-list",
              selector,
              lastKey: emittedItems[emittedItems.length - 1].identity,
              lastTitle: emittedItems[emittedItems.length - 1].title,
              lastItem: {
                title: emittedItems[emittedItems.length - 1].title,
                href: emittedItems[emittedItems.length - 1].href,
                imageUrl: emittedItems[emittedItems.length - 1].imageUrl,
                metadata: emittedItems[emittedItems.length - 1].metadata
              },
              emittedCount: startIndex + emittedItems.length
            },
            debug: {
              mode: "repeated-list",
              selector,
              domItemCount: items.length,
              uniqueItemCount: uniqueItems.length,
              selectedSliceStart: selectedSlice?.startIndex ?? null,
              selectedSliceEnd: selectedSlice?.endIndex ?? null,
              startIndex,
              endIndex,
              emittedCount: emittedItems.length,
              firstIdentity: emittedItems[0]?.identity || null,
              lastIdentity: emittedItems[emittedItems.length - 1]?.identity || null
            }
          };
        }

        if (emittedItems.length > bestUniqueCount) {
          bestUniqueCount = emittedItems.length;
          bestHtml = \`<div data-brackeroni-captured-list="true" data-selector="\${selector}">\${emittedItems.map((item) => item.html).join("")}</div>\`;
          bestCursor = emittedItems.length
              ? {
                  mode: "repeated-list",
                  selector,
                  lastKey: emittedItems[emittedItems.length - 1].identity,
                  lastTitle: emittedItems[emittedItems.length - 1].title,
                  lastItem: {
                    title: emittedItems[emittedItems.length - 1].title,
                    href: emittedItems[emittedItems.length - 1].href,
                    imageUrl: emittedItems[emittedItems.length - 1].imageUrl,
                    metadata: emittedItems[emittedItems.length - 1].metadata
                  },
                  emittedCount: startIndex + emittedItems.length
                }
              : null;
          bestDebug = {
            mode: "repeated-list",
            selector,
            domItemCount: items.length,
            uniqueItemCount: uniqueItems.length,
            selectedSliceStart: selectedSlice?.startIndex ?? null,
            selectedSliceEnd: selectedSlice?.endIndex ?? null,
            startIndex,
            endIndex,
            emittedCount: emittedItems.length,
            firstIdentity: emittedItems[0]?.identity || null,
            lastIdentity: emittedItems[emittedItems.length - 1]?.identity || null
          };
        }
      }
    }

    return {
      html: bestHtml,
      cursor: bestCursor,
      debug: bestDebug
    };
  }

  function compactHtml(value, maxLength = MAX_HTML_CHARS) {
    const html = String(value || "").trim();

    if (!html) {
      return "";
    }

    return html.length > maxLength ? html.slice(0, maxLength) : html;
  }

  function elementTextLength(element) {
    return collapseWhitespace(element?.textContent).length;
  }

  function isStructuredSelectionBlock(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const textLength = elementTextLength(element);
    if (textLength < 20 || textLength > 6000) {
      return false;
    }

    const tagName = element.tagName?.toLowerCase?.() || "";
    const role = element.getAttribute?.("role") || "";
    const className = typeof element.className === "string" ? element.className : "";
    const id = element.id || "";
    const descriptor = (tagName + " " + role + " " + className + " " + id).toLowerCase();

    const looksLikeCardContainer =
      element.matches?.("article, li, section, [role='listitem'], [role='row'], [role='article'], [role='group']") ||
      /(^|[-_ ])(item|card|tile|entry|result|renderer|post|story|video)([-_ ]|$)/.test(descriptor);

    if (!looksLikeCardContainer) {
      return false;
    }

    return Boolean(element.querySelector?.("img, a[href], h1, h2, h3, h4"));
  }

  function collectSelectionBlocks(range, boundaryRoot) {
    if (!range || !boundaryRoot) {
      return [];
    }

    const candidates = [];
    const walker = document.createTreeWalker(boundaryRoot, NodeFilter.SHOW_ELEMENT);
    let current = walker.currentNode;

    while (current) {
      if (
        current !== boundaryRoot &&
        isStructuredSelectionBlock(current) &&
        range.intersectsNode?.(current)
      ) {
        candidates.push(current);
      }

      current = walker.nextNode();
    }

    return candidates.filter((candidate) => {
      return !candidates.some(
        (other) => other !== candidate && candidate.contains(other)
      );
    });
  }

  function captureSelectionMarkup(selection, boundaryRoot) {
    if (!selection || selection.rangeCount < 1 || !selection.toString()?.trim()) {
      return {
        html: "",
        text: ""
      };
    }

    const selectedBlocks = [];
    const seenBlocks = new Set();

    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index);
      const blocks = collectSelectionBlocks(range, boundaryRoot);

      for (const block of blocks) {
        const key =
          block.getAttribute?.("href") ||
          block.querySelector?.("a[href]")?.getAttribute?.("href") ||
          collapseWhitespace(block.querySelector?.("h1, h2, h3, h4")?.textContent) ||
          collapseWhitespace(block.textContent).slice(0, 120);

        if (key && !seenBlocks.has(key)) {
          seenBlocks.add(key);
          selectedBlocks.push(block.outerHTML);
        }
      }
    }

    if (selectedBlocks.length > 0) {
      return {
        html: selectedBlocks.join(""),
        text: selection.toString() || "",
        identities: Array.from(seenBlocks),
        blockCount: selectedBlocks.length
      };
    }

    const container = document.createElement("div");
    for (let index = 0; index < selection.rangeCount; index += 1) {
      container.appendChild(selection.getRangeAt(index).cloneContents());
    }

    return {
      html: container.innerHTML,
      text: selection.toString() || "",
      identities: [],
      blockCount: 0
    };
  }

  function readContinuationState() {
    try {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const hashPoolId = params.get("brackeroni-continue-pool");
      const hashPoolName = params.get("brackeroni-continue-name");
      const mode = params.get("brackeroni-continue-mode");
      const selector = params.get("brackeroni-continue-selector");
      const lastKey = params.get("brackeroni-continue-last-key");
      const lastTitle = params.get("brackeroni-continue-last-title");
      const emittedCount = Number(params.get("brackeroni-continue-count") || 0);

      return {
        continuePoolId: hashPoolId || ${JSON.stringify(poolId)},
        continuePoolName: hashPoolName || ${JSON.stringify(poolName)},
        continueMode: mode || null,
        continueSelector: selector || null,
        continueLastKey: lastKey || null,
        continueLastTitle: lastTitle || null,
        continueCount: Number.isFinite(emittedCount) ? emittedCount : 0
      };
    } catch {
      return {
        continuePoolId: null,
        continuePoolName: null,
        continueMode: null,
        continueSelector: null,
        continueLastKey: null,
        continueLastTitle: null,
        continueCount: 0
      };
    }
  }

  function buildSanitizedPageUrl() {
    try {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(
        url.hash.startsWith("#") ? url.hash.slice(1) : url.hash
      );

      hashParams.delete("brackeroni-continue-pool");
      hashParams.delete("brackeroni-continue-name");
      hashParams.delete("brackeroni-continue-mode");
      hashParams.delete("brackeroni-continue-selector");
      hashParams.delete("brackeroni-continue-last-key");
      hashParams.delete("brackeroni-continue-last-title");
      hashParams.delete("brackeroni-continue-count");

      url.hash = hashParams.toString();
      return url.toString();
    } catch {
      return window.location.href;
    }
  }

  const preferredRoot =
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.querySelector('[role="main"]') ||
    document.body;
  const selection = window.getSelection?.();
  const capturedSelection = captureSelectionMarkup(selection, preferredRoot || document.body);
  let selectionHtml = capturedSelection.html;
  let selectionText = capturedSelection.text;
  window.__brackeroniSelectionState = {
    identities: capturedSelection.identities || []
  };
  const continuationState = readContinuationState();
  const hasContinuationCursor = Boolean(
    continuationState.continueMode &&
      (continuationState.continueLastKey || continuationState.continueCount > 0)
  );

  await hydrateDocumentScroll();

  const resumeState = hasContinuationCursor
    ? {
        mode: continuationState.continueMode,
        selector: continuationState.continueSelector,
        lastKey: continuationState.continueLastKey,
        emittedCount: continuationState.continueCount
      }
    : null;
  const virtualizedCapture = await collectVirtualizedGridHtml(resumeState);
  const repeatedItemCapture = !virtualizedCapture.html
    ? collectRepeatedItemHtml(preferredRoot || document.body, MAX_CAPTURED_ITEMS, resumeState)
    : { html: "", cursor: null, debug: null };
  const resumedHtml = virtualizedCapture.html || repeatedItemCapture.html || "";
  if (continuationState.continuePoolId && hasContinuationCursor && !selectionHtml.trim() && !resumedHtml) {
    window.alert(
      "No new items were found after the previous continuation point. Scroll farther down or highlight the next section manually."
    );
    return;
  }
  const fallbackHtml = compactHtml(preferredRoot?.outerHTML || document.body?.outerHTML || "");
  const selectedIdentityHtml =
    (capturedSelection.identities?.length ? resumedHtml : "") || "";
  const html = compactHtml(
    selectedIdentityHtml ||
      (selectionHtml.trim()
        ? selectionHtml
        : resumedHtml || fallbackHtml)
  );
  const text = compactText(selectionText || preferredRoot?.innerText || document.body?.innerText || "");
  const payload = {
    pageTitle: document.title || "",
    pageUrl: buildSanitizedPageUrl(),
    continuePoolId: continuationState.continuePoolId,
    continuePoolName: continuationState.continuePoolName,
    selectionHtml,
    html,
    text,
    captureCursor: virtualizedCapture.cursor || repeatedItemCapture.cursor || null,
    debug: {
      selection: {
        textLength: selectionText.length,
        htmlLength: selectionHtml.length,
        blockCount: capturedSelection.blockCount || 0,
        ...summarizeSelectionState(window.__brackeroniSelectionState)
      },
      continuation: {
        hasContinuationCursor,
        continueMode: continuationState.continueMode || null,
        continueCount: continuationState.continueCount || 0
      },
      capture: {
        chosenSource: selectedIdentityHtml
          ? "selection-slice"
          : selectionHtml.trim()
            ? "selection-html"
            : resumedHtml
              ? "resumed-html"
              : "fallback-html",
        finalHtmlLength: html.length,
        virtualized: virtualizedCapture.debug || null,
        repeated: repeatedItemCapture.debug || null
      }
    }
  };
  try {
    const payloadString = JSON.stringify(payload);

    if (bridgeWindow) {
      let bridgeCompleted = false;

      const cleanup = () => {
        window.removeEventListener("message", handleBridgeMessage);
        window.clearInterval(retryTimer);
        window.clearTimeout(fallbackTimer);
      };

      const sendPayload = () => {
        try {
          bridgeWindow.postMessage(
            {
              type: IMPORT_PAYLOAD_MESSAGE_TYPE,
              payload
            },
            BRIDGE_ORIGIN
          );
        } catch {}
      };

      const handleBridgeMessage = (event) => {
        if (event.origin !== BRIDGE_ORIGIN) {
          return;
        }

        if (event.data?.type !== IMPORT_READY_MESSAGE_TYPE) {
          return;
        }

        bridgeCompleted = true;
        sendPayload();
      };

      window.addEventListener("message", handleBridgeMessage);

      try {
        bridgeWindow.location.replace(BRIDGE_URL);
      } catch {}

      const retryTimer = window.setInterval(() => {
        if (bridgeWindow.closed) {
          cleanup();
          return;
        }

        sendPayload();
      }, 350);

      const fallbackTimer = window.setTimeout(() => {
        if (bridgeCompleted || bridgeWindow.closed) {
          cleanup();
          return;
        }

        cleanup();

        try {
          window.name = payloadString;
        } catch {}

        window.location.assign("${origin}/import");
      }, 4000);

      sendPayload();
      return;
    }

    window.name = payloadString;
  } catch (error) {
    window.alert("Brackeroni could not prepare the import payload.");
    return;
  }

  window.location.assign("${origin}/import");
  await wait(50);
 })();
  `.trim();

  return `javascript:${encodeURIComponent(script)}`;
}

export function BookmarkletInstaller({
  origin,
  poolId = null,
  poolName = null,
  showInstructions = true
}) {
  const bookmarkletHref = useMemo(
    () => buildBookmarkletHref(origin, poolId, poolName),
    [origin, poolId, poolName]
  );
  const linkRef = useRef(null);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (!linkRef.current) {
      return;
    }

    linkRef.current.setAttribute("href", bookmarkletHref);
  }, [bookmarkletHref]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookmarkletHref);
      setCopyMessage("Bookmarklet copied. Create a bookmark and paste it as the URL.");
    } catch {
      setCopyMessage("Copy failed. Drag the link to your bookmarks bar instead.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {poolId ? (
          <p className="text-sm leading-7 text-[var(--accent-3)]">
            This bookmarklet will append non-duplicate candidates into{" "}
            <span className="font-bold text-[var(--ink)]">{poolName || "the selected pool"}</span>.
          </p>
        ) : null}
        <p className="text-sm leading-7 text-[var(--muted)]">
          Drag this link to your bookmarks bar. Then open any page, optionally highlight the
          relevant text, and click the bookmark to send the page into Brackeroni's import flow.
        </p>
        <a
          ref={linkRef}
          href="/tools/import"
          className="ui-button ui-button-accent-fill"
          draggable="true"
        >
          Import To Brackeroni
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleCopy} className="ui-button ui-button-muted">
            Copy Bookmarklet Code
          </button>
          {copyMessage ? <p className="text-xs leading-5 text-[var(--muted)]">{copyMessage}</p> : null}
        </div>
      </div>
      {showInstructions ? (
        <div className="space-y-3 border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
            Use It
          </p>
          <ol className="space-y-2 text-sm leading-7 text-[var(--muted)]">
            <li>1. Drag the link to your bookmarks bar, or copy the code into a new bookmark.</li>
            <li>2. Open a page on Boston.com, Wikipedia, Tripadvisor, Board Game Arena, or similar.</li>
            <li>3. Highlight text first if you want to narrow the import.</li>
            <li>4. Click the bookmarklet and finish the review on Brackeroni.</li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}
