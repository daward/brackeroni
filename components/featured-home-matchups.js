"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MobileSwipeRail } from "@/components/mobile-swipe-rail";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";

function FeaturedHomeMatchCard({ name, imageUrl, side }) {
  return (
    <div className={`home-match-card home-match-card-${side}`}>
      <div className="home-match-card-image-wrap">
        {imageUrl ? (
          <>
            <ResilientRemoteImage
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="home-match-card-backdrop"
            />
            <div className="home-match-card-glow" />
            <ResilientRemoteImage
              src={imageUrl}
              alt={name}
              className="home-match-card-image"
            />
            <div className="home-match-card-name-band">
              <p className="home-match-card-name display-face">{name}</p>
            </div>
          </>
        ) : (
          <>
            <div className="home-match-card-fallback" />
            <div className="home-match-card-name-band">
              <p className="home-match-card-name display-face">{name}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchupRow({ item }) {
  return (
    <div className="home-matchup-row">
      <FeaturedHomeMatchCard
        name={item.leftName}
        imageUrl={item.leftImageUrl}
        side="left"
      />
      <div className="home-match-vs-column">
        <p className="home-match-vs-text display-face">
          <span className="home-match-vs-text-inner">Vs</span>
        </p>
      </div>
      <FeaturedHomeMatchCard
        name={item.rightName}
        imageUrl={item.rightImageUrl}
        side="right"
      />
    </div>
  );
}

function MobileFeaturedHalf({ name, imageUrl, align = "top" }) {
  return (
    <div className="home-mobile-half">
      {imageUrl ? (
        <>
          <ResilientRemoteImage
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="home-mobile-half-backdrop"
          />
          <div className="home-mobile-half-glow" />
          <ResilientRemoteImage
            src={imageUrl}
            alt={name}
            className={`home-mobile-half-foreground ${
              align === "top" ? "home-mobile-half-foreground-top" : "home-mobile-half-foreground-bottom"
            }`}
          />
        </>
      ) : (
        <div className="home-mobile-half-fallback" />
      )}
      <div
        className={`home-mobile-half-label ${
          align === "top" ? "home-mobile-half-label-top" : "home-mobile-half-label-bottom"
        }`}
      >
        <p className="home-mobile-half-name display-face">{name}</p>
      </div>
    </div>
  );
}

function MobileMatchupCard({ item }) {
  return (
    <div className="home-mobile-matchup-card">
      <MobileFeaturedHalf name={item.leftName} imageUrl={item.leftImageUrl} align="top" />
      <div className="home-mobile-vs-divider">
        <div className="home-mobile-vs-badge">
          <p className="home-mobile-vs-text display-face">VS</p>
        </div>
      </div>
      <MobileFeaturedHalf name={item.rightName} imageUrl={item.rightImageUrl} align="bottom" />
    </div>
  );
}

export function FeaturedHomeVoteSection({ items }) {
  const safeItems = useMemo(() => items ?? [], [items]);
  const desktopItems = safeItems.slice(0, 2);

  if (!safeItems.length) {
    return (
      <Link href="/vote" className="home-vote-fallback">
        <div className="home-vote-fallback-body">
          <p className="ui-section-kicker">Public Brackets</p>
          <p className="home-vote-fallback-title display-face">No Live Public Matchup</p>
          <p className="home-vote-fallback-copy">Browse current voting and finished results.</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="home-vote-section">
      <div className="home-mobile-vote-only">
        <MobileSwipeRail
          items={safeItems}
          getKey={(item) => `${item.tournamentId}:${item.matchId}`}
          railClassName="home-mobile-swipe-rail-votes"
          renderItem={(item) => (
            <>
              <div className="home-mobile-vote-header">
                <div className="home-mobile-vote-header-row">
                  <div>
                    <h2 className="home-vote-entry-title display-face">{item.tournamentTitle}</h2>
                    <p className="home-vote-entry-meta">
                      {`Round ${item.roundNumber} | Live Voting Now`}
                    </p>
                  </div>
                </div>
              </div>
              <Link
                href={item.voteHref || `/vote?tournament=${item.tournamentId}`}
                className="home-mobile-vote-link"
              >
                <MobileMatchupCard item={item} />
              </Link>
            </>
          )}
        />
      </div>

      <div className="home-desktop-vote-list">
        <div className="home-desktop-vote-grid">
          {desktopItems.map((item, index) => (
            <Link
              key={`${item.tournamentId}:${item.matchId}`}
              href={item.voteHref || `/vote?tournament=${item.tournamentId}`}
              className="home-desktop-vote-link"
            >
              <div className="home-desktop-vote-header">
                <h2 className="home-vote-entry-title display-face">{item.tournamentTitle}</h2>
                <p className="home-vote-entry-meta">
                  {`Round ${item.roundNumber} | Live Voting Now`}
                </p>
              </div>
              <MatchupRow item={item} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
