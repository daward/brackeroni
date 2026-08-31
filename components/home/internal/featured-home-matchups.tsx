"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MobileSwipeRail } from "@/components/shared";
import type { FeaturedHomeVoteSectionProps } from "../types";
import { MatchupRow } from "./matchup-row";
import { MobileMatchupCard } from "./mobile-matchup-card";

export function FeaturedHomeVoteSection({ items }: FeaturedHomeVoteSectionProps) {
  const safeItems = useMemo(() => items ?? [], [items]);
  const desktopItems = safeItems.slice(0, 2);

  if (!safeItems.length) {
    return (
      <Link href="/vote" prefetch={false} className="home-vote-fallback">
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
          railClassName="mobile-swipe-rail-votes"
          renderItem={(item) => (
            <Link
              href={item.voteHref || `/vote?bracket=${item.tournamentId}`}
              prefetch={false}
              className="home-mobile-vote-link"
            >
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
              <MobileMatchupCard item={item} />
            </Link>
          )}
        />
      </div>

      <div className="home-desktop-vote-list">
        <div className="home-desktop-vote-grid">
          {desktopItems.map((item) => (
            <Link
              key={`${item.tournamentId}:${item.matchId}`}
              href={item.voteHref || `/vote?bracket=${item.tournamentId}`}
              prefetch={false}
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
