"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPool, listPools, listTournaments } from "@/lib/client-api/create-workspace";
import type { BracketSetupDraft } from "@/lib/brackets/types";
import type { BracketPoolOption } from "../types";

export function useBracketSetupData(routeDraftId: string | null) {
  const searchParams = useSearchParams();
  const [pools, setPools] = useState<BracketPoolOption[]>([]);
  const [draft, setDraft] = useState<BracketSetupDraft | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const requestedPoolId = searchParams?.get("poolId") || null;
    Promise.all([listPools(), listTournaments(), requestedPoolId ? getPool(requestedPoolId).catch(() => null) : Promise.resolve(null)])
      .then(([poolData, tournamentData, requestedPoolData]) => {
        const listedPools = poolData.items || [];
        const requestedPool = requestedPoolData?.item || null;
        setPools(requestedPool && !listedPools.some((pool: BracketPoolOption) => pool.id === requestedPool.id) ? [requestedPool, ...listedPools] : listedPools);
        const draftId = routeDraftId || searchParams?.get("draftId");
        setDraft(draftId ? (tournamentData.items || []).find((item: { id: string; status: string }) => item.id === draftId && item.status === "draft") || null : null);
      })
      .finally(() => setLoading(false));
  }, [routeDraftId, searchParams]);
  return { searchParams, pools, draft, loading };
}
