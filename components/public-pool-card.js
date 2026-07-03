"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";

function FavoriteStar({ isFavorited }) {
  return (
    <span
      className={`home-favorite-star ${
        isFavorited ? "home-favorite-star-filled" : "home-favorite-star-empty"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`home-favorite-star-outline-icon ${
          isFavorited ? "home-favorite-star-outline-hidden" : "home-favorite-star-outline-visible"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      >
        <path d="M12 2.8l2.82 5.72 6.31.92-4.56 4.45 1.08 6.29L12 17.2l-5.65 2.98 1.08-6.29L2.87 9.44l6.31-.92L12 2.8z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`home-favorite-star-fill-icon ${
          isFavorited ? "home-favorite-star-fill-visible" : "home-favorite-star-fill-hidden"
        }`}
        fill="currentColor"
      >
        <path d="M12 2.8l2.82 5.72 6.31.92-4.56 4.45 1.08 6.29L12 17.2l-5.65 2.98 1.08-6.29L2.87 9.44l6.31-.92L12 2.8z" />
      </svg>
    </span>
  );
}

export function PublicPoolCard({
  pool,
  href = null,
  favoriteMode = "create",
  signedIn = false
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFavoriting, startFavoriting] = useTransition();
  const previewCandidates = pool.previewCandidates || [];
  const [visibleIndexes, setVisibleIndexes] = useState(() =>
    previewCandidates.slice(0, 4).map((_, index) => index)
  );
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  useEffect(() => {
    setVisibleIndexes(previewCandidates.slice(0, 4).map((_, index) => index));
    setActiveOverlay(null);
    setIsOverlayVisible(false);
  }, [pool.id, previewCandidates.length]);

  useEffect(() => {
    if (previewCandidates.length < 2 || visibleIndexes.length === 0) {
      return undefined;
    }

    let timeoutId;
    let frameId;

    function scheduleNext(minDelay, maxDelay) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      timeoutId = window.setTimeout(() => {
        const slotPosition = Math.floor(Math.random() * visibleIndexes.length);
        const currentVisibleIndexes = new Set(visibleIndexes);
        const hiddenIndexes = previewCandidates
          .map((_, index) => index)
          .filter((index) => !currentVisibleIndexes.has(index));
        const replacementPool =
          hiddenIndexes.length > 0
            ? hiddenIndexes
            : previewCandidates
                .map((_, index) => index)
                .filter((index) => index !== visibleIndexes[slotPosition]);
        const nextIndex =
          replacementPool[Math.floor(Math.random() * replacementPool.length)];

        setActiveOverlay({
          slotPosition,
          nextIndex
        });
        setIsOverlayVisible(false);

        frameId = window.requestAnimationFrame(() => {
          setIsOverlayVisible(true);
        });

        timeoutId = window.setTimeout(() => {
          setVisibleIndexes((current) =>
            current.map((candidateIndex, index) =>
              index === slotPosition ? nextIndex : candidateIndex
            )
          );
          setActiveOverlay(null);
          setIsOverlayVisible(false);
          scheduleNext(3200, 5800);
        }, 900);
      }, delay);
    }

    scheduleNext(1400, 3000);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [previewCandidates, visibleIndexes]);

  const visibleCandidates = visibleIndexes
    .map((candidateIndex) => previewCandidates[candidateIndex])
    .filter(Boolean);
  const primaryHref = href || `/create?makeBracketFromPool=${pool.id}`;
  const signInHref = `/api/auth/signin?callbackUrl=${encodeURIComponent(pathname || `/pools/${pool.id}`)}`;

  function handleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (favoriteMode !== "inline" || pool.isFavorited || !signedIn) {
      return;
    }

    startFavoriting(async () => {
      const response = await fetch(`/api/pools/${pool.id}/favorite`, {
        method: "POST"
      });

      if (!response.ok) {
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="home-pool-card">
      <Link
        href={primaryHref}
        aria-label={href ? `View ${pool.name}` : `Make bracket from ${pool.name}`}
        className="home-pool-card-primary-link"
      />
      <div className="home-pool-card-content">
        <div className="home-pool-card-main">
          <div className="home-pool-card-topline">
            <p className="home-pool-card-meta">{pool.candidateCount} candidates</p>
            {pool.isFavorited ? (
              <Link
                href={`/create?view=pools&pool=${pool.favoritePoolId}`}
                aria-label="Open saved pool"
                title="Saved in your pools"
                className="home-star-link"
              >
                <FavoriteStar isFavorited />
              </Link>
            ) : favoriteMode === "inline" ? (
              signedIn ? (
                <button
                  type="button"
                  onClick={handleFavorite}
                  disabled={isFavoriting}
                  aria-label="Add to favorites"
                  title="Add to favorites"
                  className="home-star-button"
                >
                  <FavoriteStar isFavorited={false} />
                </button>
              ) : (
                <Link
                  href={signInHref}
                  aria-label="Sign in to add to favorites"
                  title="Sign in to add to favorites"
                  className="home-star-link"
                >
                  <FavoriteStar isFavorited={false} />
                </Link>
              )
            ) : (
              <Link
                href={`/create?favoritePool=${pool.id}`}
                aria-label="Add to favorites"
                title="Add to favorites"
                className="home-star-link"
              >
                <FavoriteStar isFavorited={false} />
              </Link>
            )}
          </div>
          <div className="home-pool-card-title-row">
            <h3 className="home-pool-card-title display-face">{pool.name}</h3>
          </div>
          <p className="home-pool-card-description">
            {pool.description || "A published pool ready to be turned into new brackets."}
          </p>
          <p className="home-pool-card-byline">
            By {pool.creatorName || pool.creatorEmail}
          </p>
        </div>
        <div className="home-pool-card-preview-grid">
          {visibleCandidates.map((candidate, index) => (
            <div
              key={`${candidate.id}:${index}`}
              className="home-pool-preview-tile"
            >
              {candidate.imageUrl ? (
                <ResilientRemoteImage
                  src={candidate.imageUrl}
                  alt={candidate.name}
                  className="home-pool-preview-image"
                />
              ) : (
                <div className="home-pool-preview-fallback">
                  <p className="home-pool-preview-fallback-name">
                    {candidate.name}
                  </p>
                </div>
              )}
              {activeOverlay?.slotPosition === index ? (
                previewCandidates[activeOverlay.nextIndex]?.imageUrl ? (
                  <ResilientRemoteImage
                    src={previewCandidates[activeOverlay.nextIndex].imageUrl}
                    alt={previewCandidates[activeOverlay.nextIndex].name}
                    className={`home-pool-preview-overlay-image ${
                      isOverlayVisible ? "home-pool-preview-visible" : "home-pool-preview-hidden"
                    }`}
                  />
                ) : (
                  <div
                    className={`home-pool-preview-overlay-fallback ${
                      isOverlayVisible ? "home-pool-preview-visible" : "home-pool-preview-hidden"
                    }`}
                  >
                    <p className="home-pool-preview-fallback-name">
                      {previewCandidates[activeOverlay.nextIndex]?.name}
                    </p>
                  </div>
                )
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
