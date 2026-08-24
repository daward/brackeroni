"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./pool-source-info.module.css";
import type { PoolSourceInfoProps } from "../types";

export function PoolSourceInfo({ sourceUrl, sourceTitle }: PoolSourceInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeIfOutside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node) || !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
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
    <div ref={containerRef} className={styles.container} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <button
        type="button"
        aria-label="View import source"
        aria-expanded={isOpen}
        aria-controls="pool-import-source"
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen((current) => !current)}
        className={styles.trigger}
      >
        i
      </button>
      {isOpen ? (
        <div id="pool-import-source" role="dialog" aria-label="Import source" className={styles.popover}>
          <p className={`${styles.label} display-face`}>Imported from</p>
          <a href={sourceUrl} target="_blank" rel="noreferrer" className={`${styles.link} ui-copy`}>
            {sourceTitle || sourceHost}
          </a>
          {sourceTitle ? <p className={styles.host}>{sourceHost}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
