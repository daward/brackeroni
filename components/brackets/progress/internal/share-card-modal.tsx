"use client";

import { useState } from "react";
import { BackdropRemoteImage } from "@/components/shared";
import type { ShareCardPayload } from "./round-progress-card";
import { buildCreatorPrompt, buildShareCardSvg, buildShareCardTitle, getShareCardItems } from "./share-card-utils";

type ShareCardModalProps = { shareCard: ShareCardPayload | null; onClose: () => void };

function downloadTextFile({ filename, text, type }: { filename: string; text: string; type: string }) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ShareCardModal({ shareCard, onClose }: ShareCardModalProps) {
  const [message, setMessage] = useState("");

  if (!shareCard) {
    return null;
  }

  const { tournament, round, stats, isFinalResults } = shareCard;
  const items = getShareCardItems(stats);
  const cardTitle = buildShareCardTitle(round, tournament, isFinalResults);

  async function handleCopyText() {
    await navigator.clipboard.writeText(buildCreatorPrompt({ tournament, round, stats }));
    setMessage("Recap text copied.");
  }

  function handleDownloadSvg() {
    const svg = buildShareCardSvg({ tournament, round, stats, isFinalResults });
    downloadTextFile({
      filename: `${tournament.title}-${cardTitle}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".svg",
      text: svg,
      type: "image/svg+xml"
    });
    setMessage("SVG downloaded.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto border border-[var(--line)] bg-[var(--page-bg)] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="results-kicker">Share Card</p>
            <h2 className="display-face mt-2 text-2xl font-black">{cardTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className="ui-button ui-button-muted">
            Close
          </button>
        </div>

        <div className="mt-4 aspect-video border border-[var(--line)] bg-[var(--panel)] p-6">
          <div className="grid h-full grid-rows-[auto_1fr_auto] border border-[var(--line-strong)] p-6">
            <div>
              <p className="display-face text-3xl font-black">BRACKERONI</p>
              <p className="display-face mt-8 text-3xl font-black text-[var(--accent-2)]">
                {cardTitle}
              </p>
              <h3 className="display-face mt-3 max-w-3xl text-4xl font-black leading-none">
                {tournament.title}
              </h3>
            </div>
            <div />
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item, index) => (
                <div
                  key={item.label}
                  className={`min-h-[8rem] border p-4 ${
                    index % 2 === 0 ? "border-[var(--accent-3)]" : "border-[var(--accent-2)]"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-3)]">
                    {item.label}
                  </p>
                  <div className="mt-3 grid grid-cols-[4.25rem_minmax(0,1fr)] gap-4">
                    {item.imageUrl ? (
                      <BackdropRemoteImage
                        src={item.imageUrl}
                        alt={item.value}
                        className="h-17 w-17 border border-[var(--line)]"
                        imageClassName="object-cover object-center"
                        undersizedImageClassName="object-contain p-1"
                        minimumSourceWidth={68}
                        minimumSourceHeight={68}
                      />
                    ) : (
                      <div className="h-17 w-17 border border-[var(--line)] bg-[var(--panel-2)]" />
                    )}
                    <div className="min-w-0">
                      <p className="display-face text-2xl font-black leading-[1.05]">
                        {item.value}
                      </p>
                      {item.detail ? (
                        <p className="mt-2 truncate text-sm leading-5 text-[var(--muted)]">
                          {item.detail}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleDownloadSvg} className="ui-button ui-button-primary">
            Download SVG
          </button>
          <button type="button" onClick={handleCopyText} className="ui-button ui-button-muted">
            Copy Recap Text
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
