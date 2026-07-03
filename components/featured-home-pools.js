"use client";

import { useMemo, useState } from "react";
import { PublicPoolCard } from "@/components/public-pool-card";

export function FeaturedHomePools({ pools }) {
  const safePools = useMemo(() => pools ?? [], [pools]);
  const [mobileIndex, setMobileIndex] = useState(0);
  const activePool = safePools[mobileIndex] ?? safePools[0] ?? null;

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
        {safePools.length > 1 ? (
          <div className="home-mobile-pager home-mobile-pager-compact">
            <button
              type="button"
              onClick={() =>
                setMobileIndex((current) => (current - 1 + safePools.length) % safePools.length)
              }
              className="home-pager-button"
              aria-label="Previous pool"
            >
              &lt;
            </button>
            <p className="home-pager-counter">{mobileIndex + 1} / {safePools.length}</p>
            <button
              type="button"
              onClick={() => setMobileIndex((current) => (current + 1) % safePools.length)}
              className="home-pager-button"
              aria-label="Next pool"
            >
              &gt;
            </button>
          </div>
        ) : null}
        {activePool ? <PublicPoolCard pool={activePool} /> : null}
      </div>

      <div className="home-pool-list-desktop">
        {safePools.map((pool) => (
          <PublicPoolCard key={pool.id} pool={pool} />
        ))}
      </div>
    </>
  );
}
