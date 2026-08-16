"use client";

import { useEffect, useRef, useState } from "react";

export function PoolSourceInfo({ sourceUrl, sourceTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeIfOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!sourceUrl) return null;

  let sourceHost = sourceUrl;
  try {
    sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {}

  return (
    <div
      ref={containerRef}
      className="relative ml-1"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label="View import source"
        aria-expanded={isOpen}
        aria-controls="pool-import-source"
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-black leading-none text-[var(--muted)] transition hover:text-[var(--accent-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-2)]"
      >
        i
      </button>
      {isOpen ? (
        <div
          id="pool-import-source"
          role="dialog"
          aria-label="Import source"
          className="absolute left-0 top-full z-30 mt-2 w-72 border border-[var(--line-strong)] bg-[var(--panel)] p-3 normal-case tracking-normal shadow-[0_16px_30px_rgba(0,0,0,0.35)]"
        >
          <p className="display-face text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent-2)]">
            Imported from
          </p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ui-copy mt-1 block text-sm leading-5 text-[var(--ink)] underline decoration-[var(--accent-2)] underline-offset-4 hover:text-[var(--accent-2)]"
          >
            {sourceTitle || sourceHost}
          </a>
          {sourceTitle ? <p className="mt-2 text-xs text-[var(--muted)]">{sourceHost}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
