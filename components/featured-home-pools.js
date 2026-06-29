"use client";

import { useMemo, useState } from "react";
import { PublicPoolCard } from "@/components/public-pool-card";

export function FeaturedHomePools({ pools }) {
  const safePools = useMemo(() => pools ?? [], [pools]);
  const [mobileIndex, setMobileIndex] = useState(0);
  const activePool = safePools[mobileIndex] ?? safePools[0] ?? null;

  if (!safePools.length) {
    return (
      <div className="bg-[var(--panel)] px-5 py-6">
        <p className="display-face text-xl font-black text-[var(--muted)]">
          No Public Pools Yet
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        {safePools.length > 1 ? (
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel-3)] px-4 py-3">
            <button
              type="button"
              onClick={() =>
                setMobileIndex((current) => (current - 1 + safePools.length) % safePools.length)
              }
              className="flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[var(--panel)] text-lg text-[var(--accent-3)] transition hover:border-[var(--accent-3)]"
              aria-label="Previous pool"
            >
              &lt;
            </button>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              {mobileIndex + 1} / {safePools.length}
            </p>
            <button
              type="button"
              onClick={() => setMobileIndex((current) => (current + 1) % safePools.length)}
              className="flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[var(--panel)] text-lg text-[var(--accent-3)] transition hover:border-[var(--accent-3)]"
              aria-label="Next pool"
            >
              &gt;
            </button>
          </div>
        ) : null}
        {activePool ? <PublicPoolCard pool={activePool} /> : null}
      </div>

      <div className="hidden grid flex-1 gap-px bg-[var(--line)] md:grid">
        {safePools.map((pool) => (
          <PublicPoolCard key={pool.id} pool={pool} />
        ))}
      </div>
    </>
  );
}
