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
      type: "image/svg+xml",
    });
    setMessage("SVG downloaded.");
  }

  return (
    <div className="progress-share-card-overlay">
      <div className="progress-share-card-dialog">
        <div className="progress-share-card-header">
          <div>
            <p className="results-kicker">Share Card</p>
            <h2 className="progress-share-card-title">{cardTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className="ui-button ui-button-muted">
            Close
          </button>
        </div>

        <div className="progress-share-card-preview">
          <div className="progress-share-card-canvas">
            <div>
              <p className="progress-share-card-brand">BRACKERONI</p>
              <p className="progress-share-card-kicker">{cardTitle}</p>
              <h3 className="progress-share-card-heading">{tournament.title}</h3>
            </div>
            <div />
            <div className="progress-share-card-grid">
              {items.map((item, index) => (
                <div key={item.label} className={getShareCardItemClassName(index)}>
                  <p className="progress-share-card-label">{item.label}</p>
                  <div className="progress-share-card-item-body">
                    {item.imageUrl ? (
                      <BackdropRemoteImage
                        src={item.imageUrl}
                        alt={item.value}
                        className="progress-share-card-image"
                        imageClassName="object-cover object-center"
                        undersizedImageClassName="object-contain p-1"
                        minimumSourceWidth={68}
                        minimumSourceHeight={68}
                      />
                    ) : (
                      <div className="progress-share-card-image-fallback" />
                    )}
                    <div className="progress-share-card-copy">
                      <p className="progress-share-card-value">{item.value}</p>
                      {item.detail ? <p className="progress-share-card-detail">{item.detail}</p> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="progress-share-card-actions">
          <button type="button" onClick={handleDownloadSvg} className="ui-button ui-button-primary">
            Download SVG
          </button>
          <button type="button" onClick={handleCopyText} className="ui-button ui-button-muted">
            Copy Recap Text
          </button>
          {message ? <p className="progress-share-card-message">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

function getShareCardItemClassName(index: number) {
  const toneClass = index % 2 === 0 ? "" : "progress-share-card-item-yellow";
  return `progress-share-card-item ${toneClass}`.trim();
}
