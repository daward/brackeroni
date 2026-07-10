"use client";

import { useMemo } from "react";
import { MobileSwipeRail } from "@/components/mobile-swipe-rail";
import { PublicPoolCard } from "@/components/public-pool-card";

export function FeaturedHomePools({ pools, signedIn = false }) {
  const safePools = useMemo(() => pools ?? [], [pools]);

  if (!safePools.length) {
    return (
      <div className="home-empty-panel">
        <p className="home-empty-title display-face">No Public Pools Yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="home-pool-list-mobile">
        <MobileSwipeRail
          items={safePools}
          getKey={(pool) => pool.id}
          railClassName="home-mobile-swipe-rail-pools"
          renderItem={(pool) => <PublicPoolCard pool={pool} signedIn={signedIn} />}
        />
      </div>

      <div className="home-pool-list-desktop">
        {safePools.map((pool) => (
          <PublicPoolCard key={pool.id} pool={pool} signedIn={signedIn} />
        ))}
      </div>
    </>
  );
}
