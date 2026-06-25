"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function buildBookmarkletHref(origin) {
  const script = `
 (async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  function captureGridRows(grid, seenRows) {
    const rows = [...grid.querySelectorAll('[data-testid="tracklist-row"]')];

    for (const row of rows) {
      const rowHost = row.closest('[role="row"]') || row.parentElement || row;
      const rowIndex = rowHost?.getAttribute('aria-rowindex') || row.getAttribute('aria-rowindex') || "";
      const trackLink = row.querySelector('[data-testid="internal-track-link"]');
      const key = rowIndex || trackLink?.getAttribute('href') || row.textContent?.trim() || "";

      if (!key || seenRows.has(key)) {
        continue;
      }

      seenRows.set(key, rowHost.outerHTML);
    }
  }

  async function collectVirtualizedGridHtml() {
    const grids = [...document.querySelectorAll('[data-testid="playlist-tracklist"][role="grid"][aria-rowcount], [role="grid"][aria-rowcount]')]
      .filter((entry) => !entry.closest('[data-testid="recommended-track"]'))
      .sort((left, right) => Number(right.getAttribute('aria-rowcount') || 0) - Number(left.getAttribute('aria-rowcount') || 0));
    const grid = grids[0];
    if (!grid) {
      return "";
    }

    const expectedRowCount = Number(grid.getAttribute('aria-rowcount') || 0);
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

    const orderedRows = [...seenRows.entries()]
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map((entry) => entry[1]);

    return \`<div data-brackeroni-captured-grid="true" data-rowcount="\${expectedRowCount}">\${orderedRows.join("")}</div>\`;
  }

  const selection = window.getSelection?.();
  let selectionHtml = "";
  if (selection && selection.rangeCount > 0 && selection.toString()?.trim()) {
    const container = document.createElement("div");
    for (let index = 0; index < selection.rangeCount; index += 1) {
      container.appendChild(selection.getRangeAt(index).cloneContents());
    }
    selectionHtml = container.innerHTML;
  }
  const preferredRoot =
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.querySelector('[role="main"]') ||
    document.body;
  const virtualizedHtml = !selectionHtml ? await collectVirtualizedGridHtml() : "";
  const html = virtualizedHtml || preferredRoot?.outerHTML || document.body?.outerHTML || "";
  const payload = {
    pageTitle: document.title || "",
    pageUrl: window.location.href,
    selectionHtml,
    html
  };
  const target = "${origin}/import";
  window.name = JSON.stringify(payload);
  window.location.href = target;
 })();
  `.trim();

  return `javascript:${encodeURIComponent(script)}`;
}

export function BookmarkletInstaller({ origin }) {
  const bookmarkletHref = useMemo(() => buildBookmarkletHref(origin), [origin]);
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
    </div>
  );
}
