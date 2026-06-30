"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";

function FavoriteStar({ isFavorited }) {
  return (
    <span
      className={`relative block h-8 w-8 transition ${
        isFavorited
          ? "text-[var(--accent-2)] hover:text-[var(--accent-3)]"
          : "text-[var(--muted)] hover:text-[var(--accent-2)]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`absolute inset-0 h-8 w-8 transition ${
          isFavorited ? "opacity-0" : "opacity-100 group-hover/star:opacity-0"
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
        className={`absolute inset-0 h-8 w-8 transition ${
          isFavorited ? "opacity-100" : "opacity-0 group-hover/star:opacity-100"
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
    <div className="group relative bg-[var(--panel)] px-5 py-5 transition hover:bg-[var(--panel-2)]">
      <Link
        href={primaryHref}
        aria-label={href ? `View ${pool.name}` : `Make bracket from ${pool.name}`}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none relative z-10 grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem] md:items-start">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
              {pool.candidateCount} candidates
            </p>
            {pool.isFavorited ? (
              <Link
                href={`/create?view=pools&pool=${pool.favoritePoolId}`}
                aria-label="Open saved pool"
                title="Saved in your pools"
                className="pointer-events-auto group/star"
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
                  className="pointer-events-auto group/star disabled:opacity-60"
                >
                  <FavoriteStar isFavorited={false} />
                </button>
              ) : (
                <Link
                  href={signInHref}
                  aria-label="Sign in to add to favorites"
                  title="Sign in to add to favorites"
                  className="pointer-events-auto group/star"
                >
                  <FavoriteStar isFavorited={false} />
                </Link>
              )
            ) : (
              <Link
                href={`/create?favoritePool=${pool.id}`}
                aria-label="Add to favorites"
                title="Add to favorites"
                className="pointer-events-auto group/star"
              >
                <FavoriteStar isFavorited={false} />
              </Link>
            )}
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h3 className="display-face text-2xl font-black">{pool.name}</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {pool.description || "A published pool ready to be turned into new brackets."}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            By {pool.creatorName || pool.creatorEmail}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {visibleCandidates.map((candidate, index) => (
            <div
              key={`${candidate.id}:${index}`}
              className="relative overflow-hidden border border-[var(--line)] bg-[var(--panel-3)]"
            >
              {candidate.imageUrl ? (
                <ResilientRemoteImage
                  src={candidate.imageUrl}
                  alt={candidate.name}
                  className="aspect-square h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-end bg-[linear-gradient(180deg,rgba(52,211,196,0.08),rgba(15,15,15,0.9))] p-2">
                  <p className="line-clamp-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink)]">
                    {candidate.name}
                  </p>
                </div>
              )}
              {activeOverlay?.slotPosition === index ? (
                previewCandidates[activeOverlay.nextIndex]?.imageUrl ? (
                  <ResilientRemoteImage
                    src={previewCandidates[activeOverlay.nextIndex].imageUrl}
                    alt={previewCandidates[activeOverlay.nextIndex].name}
                    className={`absolute inset-0 aspect-square h-full w-full object-cover transition-opacity duration-[900ms] ${
                      isOverlayVisible ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ) : (
                  <div
                    className={`absolute inset-0 flex aspect-square items-end bg-[linear-gradient(180deg,rgba(52,211,196,0.16),rgba(15,15,15,0.96))] p-2 transition-opacity duration-[900ms] ${
                      isOverlayVisible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <p className="line-clamp-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink)]">
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
