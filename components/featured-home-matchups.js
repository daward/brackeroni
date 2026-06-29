"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";

function FeaturedHomeMatchCard({ name, seed, imageUrl }) {
  return (
    <div className="group/card bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-4 py-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent-2)]">Seed {seed}</p>
      </div>
      <div className="relative h-44 overflow-hidden bg-[var(--panel-3)] sm:h-52">
        {imageUrl ? (
          <>
            <ResilientRemoteImage
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl saturate-125"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(15,15,15,0.08)_40%,rgba(15,15,15,0.72)_100%)]" />
            <ResilientRemoteImage
              src={imageUrl}
              alt={name}
              className="relative z-10 h-full w-full object-contain object-bottom px-2 pb-0 pt-2 transition duration-200 group-hover/card:scale-[1.03] sm:px-3 sm:pt-3"
            />
            <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,transparent,rgba(10,10,10,0.82)_55%,rgba(10,10,10,0.98))] px-4 pb-3 pt-10 sm:px-5 sm:pb-4">
              <p className="display-face text-lg font-black leading-tight sm:text-xl">{name}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-full items-end bg-[linear-gradient(180deg,rgba(52,211,196,0.08),rgba(15,15,15,0.95))] p-3" />
            <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,transparent,rgba(10,10,10,0.82)_55%,rgba(10,10,10,0.98))] px-4 pb-3 pt-10 sm:px-5 sm:pb-4">
              <p className="display-face text-lg font-black leading-tight sm:text-xl">{name}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchupRow({ item }) {
  return (
    <div className="grid gap-px bg-[var(--line)] md:grid-cols-[1fr_auto_1fr]">
      <FeaturedHomeMatchCard
        name={item.leftName}
        seed={item.leftSeed}
        imageUrl={item.leftImageUrl}
      />
      <div className="flex items-center justify-center bg-[var(--panel-3)] px-5 py-6">
        <div className="text-center">
          <p className="display-face text-2xl font-black tracking-[0.18em] text-[var(--accent-2)]">
            Vs
          </p>
        </div>
      </div>
      <FeaturedHomeMatchCard
        name={item.rightName}
        seed={item.rightSeed}
        imageUrl={item.rightImageUrl}
      />
    </div>
  );
}

function MobileFeaturedHalf({ name, imageUrl, align = "top" }) {
  return (
    <div className="relative min-h-[13rem] overflow-hidden bg-[var(--panel)]">
      {imageUrl ? (
        <>
          <ResilientRemoteImage
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl saturate-125"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),rgba(15,15,15,0.12)_44%,rgba(10,10,10,0.88)_100%)]" />
          <ResilientRemoteImage
            src={imageUrl}
            alt={name}
            className={`absolute inset-x-0 z-10 mx-auto w-[92%] max-w-[20rem] object-contain ${
              align === "top" ? "top-1 bottom-9 h-[calc(100%-2.5rem)]" : "bottom-1 top-9 h-[calc(100%-2.5rem)]"
            }`}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(52,211,196,0.06),rgba(15,15,15,0.96))]" />
      )}
      <div
        className={`absolute inset-x-0 z-20 bg-[linear-gradient(180deg,transparent,rgba(10,10,10,0.78)_42%,rgba(10,10,10,0.98))] px-4 ${
          align === "top" ? "bottom-0 pb-3 pt-12" : "bottom-0 pb-3 pt-16"
        }`}
      >
        <p className="display-face text-[1.4rem] font-black leading-none tracking-[-0.02em]">
          {name}
        </p>
      </div>
    </div>
  );
}

function MobileMatchupCard({ item }) {
  return (
    <div className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--panel)]">
      <MobileFeaturedHalf
        name={item.leftName}
        imageUrl={item.leftImageUrl}
        align="top"
      />
      <div className="relative border-t border-[var(--line)]">
        <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <p className="display-face text-2xl font-black leading-none text-[var(--accent-2)]">VS</p>
        </div>
      </div>
      <MobileFeaturedHalf
        name={item.rightName}
        imageUrl={item.rightImageUrl}
        align="bottom"
      />
    </div>
  );
}

export function FeaturedHomeVoteSection({ items }) {
  const safeItems = useMemo(() => items ?? [], [items]);
  const [mobileIndex, setMobileIndex] = useState(0);
  const activeItem = safeItems[mobileIndex] ?? safeItems[0] ?? null;
  const desktopItem = safeItems[0] ?? null;

  if (!safeItems.length) {
    return (
      <Link
        href="/vote"
        className="group flex min-h-full flex-col bg-[var(--panel)] transition hover:bg-[var(--panel-2)]"
      >
        <div className="px-5 py-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
            Public Brackets
          </p>
          <p className="display-face mt-3 text-2xl font-black text-[var(--muted)]">
            No Live Public Matchup
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Browse current voting and finished results.
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-[var(--panel)]">
      <div className="md:hidden">
        <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                Vote Right Now
              </p>
              <h2 className="display-face mt-1 text-2xl font-black">{activeItem.tournamentTitle}</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {`Round ${activeItem.roundNumber} | Live Public Matchup`}
              </p>
            </div>
            {safeItems.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMobileIndex((current) => (current - 1 + safeItems.length) % safeItems.length)
                  }
                  className="flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[var(--panel)] text-lg text-[var(--accent-3)] transition hover:border-[var(--accent-3)]"
                  aria-label="Previous bracket"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={() => setMobileIndex((current) => (current + 1) % safeItems.length)}
                  className="flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[var(--panel)] text-lg text-[var(--accent-3)] transition hover:border-[var(--accent-3)]"
                  aria-label="Next bracket"
                >
                  &gt;
                </button>
              </div>
            ) : null}
          </div>
          {safeItems.length > 1 ? (
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              {mobileIndex + 1} / {safeItems.length}
            </p>
          ) : null}
        </div>
        <Link
          href={`/vote?tournament=${activeItem.tournamentId}`}
          className="group block transition hover:bg-[var(--panel-2)]"
        >
          <MobileMatchupCard item={activeItem} />
        </Link>
      </div>

      <div className="hidden md:block">
        <Link
          href={`/vote?tournament=${desktopItem.tournamentId}`}
          className="group block transition hover:bg-[var(--panel-2)]"
        >
          <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
              Vote Right Now
            </p>
            <h2 className="display-face mt-1 text-2xl font-black sm:text-3xl">
              {desktopItem.tournamentTitle}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {`Round ${desktopItem.roundNumber} | Live Public Matchup`}
            </p>
          </div>
          <div className="grid gap-px bg-[var(--line)]">
            <MatchupRow item={desktopItem} />
          </div>
        </Link>
      </div>
    </div>
  );
}
