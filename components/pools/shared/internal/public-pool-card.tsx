"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useTransition,
  type MouseEvent
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ContentCard, ResilientRemoteImage } from "@/components/shared";
import {
  addPoolToFavorites,
  createAndStartFavoriteBracket
} from "@/lib/client-api/public-pools";
import styles from "./public-pool-card.module.css";
import type { PublicPoolCardProps } from "../types";

type PreviewOverlay = {
  slotPosition: number;
  nextIndex: number;
};

function FavoriteStar({ isFavorited }: { isFavorited: boolean }) {
  return (
    <span
      className={`${styles.favoriteStar} ${
        isFavorited ? styles.favoriteStarFilled : styles.favoriteStarEmpty
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`${styles.favoriteStarOutlineIcon} ${
          isFavorited ? styles.favoriteStarOutlineHidden : styles.favoriteStarOutlineVisible
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
        className={`${styles.favoriteStarFillIcon} ${
          isFavorited ? styles.favoriteStarFillVisible : styles.favoriteStarFillHidden
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
  signedIn = false,
  fillContainer = false
}: PublicPoolCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFavoriting, startFavoriting] = useTransition();
  const [isCreatingFavoriteBracket, startCreatingFavoriteBracket] = useTransition();
  const previewCandidates = pool.previewCandidates || [];
  const [visibleIndexes, setVisibleIndexes] = useState(() =>
    previewCandidates.slice(0, 4).map((_, index) => index)
  );
  const [activeOverlay, setActiveOverlay] = useState<PreviewOverlay | null>(null);
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

    let timeoutId: number | undefined;
    let frameId: number | undefined;

    function scheduleNext(minDelay: number, maxDelay: number) {
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
  const primaryHref = href || `/pools/${pool.id}`;
  const signInHref = `/api/auth/signin?callbackUrl=${encodeURIComponent(pathname || `/pools/${pool.id}`)}`;

  function handleFavorite(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (favoriteMode !== "inline" || pool.isFavorited || !signedIn) {
      return;
    }

    startFavoriting(async () => {
      try {
        await addPoolToFavorites(pool.id);
      } catch {
        return;
      }

      router.refresh();
    });
  }

  function handleChooseFavorite(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!signedIn || isCreatingFavoriteBracket) {
      return;
    }

    startCreatingFavoriteBracket(async () => {
      let tournament;
      try {
        tournament = await createAndStartFavoriteBracket(pool);
      } catch {
        return;
      }

      window.location.assign(`/vote?tournament=${tournament.id}`);
    });
  }

  return (
    <ContentCard className={`${styles.card} ${fillContainer ? styles.cardFillContainer : ""}`}>
      <Link
        href={primaryHref}
        aria-label={href ? `View ${pool.name}` : `Make bracket from ${pool.name}`}
        className={styles.primaryLink}
      />
      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.topline}>
            <p className={styles.meta}>{pool.candidateCount} candidates</p>
            {pool.isFavorited ? (
              <Link
                href={`/pools/${pool.favoritePoolId}`}
                aria-label="Open saved pool"
                title="Saved in your pools"
                className={styles.starLink}
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
                  className={styles.starButton}
                >
                  <FavoriteStar isFavorited={false} />
                </button>
              ) : (
                <Link
                  href={signInHref}
                  aria-label="Sign in to add to favorites"
                  title="Sign in to add to favorites"
                  className={styles.starLink}
                >
                  <FavoriteStar isFavorited={false} />
                </Link>
              )
            ) : (
              <Link
                href={`/pools/${pool.id}`}
                aria-label="Add to favorites"
                title="Add to favorites"
                className={styles.starLink}
              >
                <FavoriteStar isFavorited={false} />
              </Link>
            )}
          </div>
          <div className={styles.titleRow}>
            <h3 className={`${styles.title} display-face`}>{pool.name}</h3>
          </div>
          <p className={styles.description}>
            {pool.description || "A published pool ready to be turned into new brackets."}
          </p>
          <p className={styles.byline}>
            By {pool.creatorName || pool.creatorEmail}
          </p>
          <div className={styles.actions}>
            {signedIn ? (
              <button
                type="button"
                onClick={handleChooseFavorite}
                disabled={isCreatingFavoriteBracket}
                className={`${styles.action} ui-button ui-button-highlight`}
              >
                {isCreatingFavoriteBracket ? "Creating" : "Find Your Favorite"}
              </button>
            ) : (
              <Link
                href={signInHref}
                className={`${styles.action} ui-button ui-button-highlight`}
              >
                Find Your Favorite
              </Link>
            )}
          </div>
        </div>
        <div className={styles.previewGrid}>
          {visibleCandidates.map((candidate, index) => (
            <div
              key={`${candidate.id}:${index}`}
              className={styles.previewTile}
            >
              {candidate.imageUrl ? (
                <ResilientRemoteImage
                  src={candidate.imageUrl}
                  alt={candidate.name}
                  className={styles.previewImage}
                />
              ) : (
                <div className={styles.previewFallback}>
                  <p className={styles.previewFallbackName}>
                    {candidate.name}
                  </p>
                </div>
              )}
              {activeOverlay?.slotPosition === index ? (
                previewCandidates[activeOverlay.nextIndex]?.imageUrl ? (
                  <ResilientRemoteImage
                    src={previewCandidates[activeOverlay.nextIndex].imageUrl}
                    alt={previewCandidates[activeOverlay.nextIndex].name}
                    className={`${styles.previewOverlayImage} ${
                      isOverlayVisible ? styles.previewVisible : styles.previewHidden
                    }`}
                  />
                ) : (
                  <div
                    className={`${styles.previewOverlayFallback} ${
                      isOverlayVisible ? styles.previewVisible : styles.previewHidden
                    }`}
                  >
                    <p className={styles.previewFallbackName}>
                      {previewCandidates[activeOverlay.nextIndex]?.name}
                    </p>
                  </div>
                )
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </ContentCard>
  );
}
