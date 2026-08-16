"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BracketCreationWizard } from "@/components/brackets/configuration/bracket-creation-wizard";
import {
  createParallelTournament,
  createPool,
  createTournament,
  getPool,
  listPools,
  listTournaments,
  updateTournament
} from "@/lib/client-api/create-workspace";
import { isParallelResultMode } from "@/lib/bracket-modes";

export function NewBracketSetupPage({ draftId: routeDraftId = null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pools, setPools] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const requestedPoolId = searchParams?.get("poolId") || null;

    Promise.all([
      listPools(),
      listTournaments(),
      requestedPoolId ? getPool(requestedPoolId).catch(() => null) : Promise.resolve(null)
    ])
      .then(([poolData, tournamentData, requestedPoolData]) => {
        const listedPools = poolData.items || [];
        const requestedPool = requestedPoolData?.item || null;
        setPools(
          requestedPool && !listedPools.some((pool) => pool.id === requestedPool.id)
            ? [requestedPool, ...listedPools]
            : listedPools
        );
        const draftId = routeDraftId || searchParams?.get("draftId");
        setDraft(draftId ? (tournamentData.items || []).find((item) => item.id === draftId && item.status === "draft") || null : null);
      })
      .finally(() => setLoading(false));
  }, [routeDraftId, searchParams]);

  async function handleCreate({ title, source, playStyle, resultMode, advancementMode, tieBreakMode, seedingMode, seedCandidateIds, audienceMode }) {
    setCreating(true);
    try {
      const pool = source.type === "existing"
        ? source.pool
        : (await createPool({
            name: source.name,
            description: null,
            visibility: "private",
            source: {
              type: "items",
              items: source.candidates.map(({ name, description, imageUrl, tags }) => ({
                name,
                description,
                imageUrl,
                tags
              }))
            }
          })).item;
      const audience = audienceMode === "friends"
        ? { sharingMode: "with_friends", visibility: "private", votingAccess: "signed_in_only" }
        : audienceMode === "public"
          ? { sharingMode: "private", visibility: "public_listed", votingAccess: "anyone" }
          : { sharingMode: "private", visibility: "private", votingAccess: "signed_in_only" };
      const payload = {
        title: title || `${pool.name} Bracket`,
        description: null,
        sourcePoolId: pool.id,
        playStyle,
        resultMode,
        advancementMode,
        tieBreakMode,
        seedCandidateIds: seedingMode === "custom" ? seedCandidateIds : undefined,
        ...audience
      };
      const isParallelBracket = isParallelResultMode(resultMode);
      const data = isParallelBracket
        ? await createParallelTournament({
            title: payload.title,
            description: payload.description,
            sourcePoolId: payload.sourcePoolId,
            sharingMode: payload.sharingMode,
            visibility: payload.visibility,
            votingAccess: payload.votingAccess,
            playStyle,
            resultMode,
            tieBreakMode
          })
        : draft
          ? await updateTournament(draft.id, payload)
          : await createTournament(payload);
      router.push("/brackets?stage=draft");
      return data.item;
    } catch {
      return null;
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading your pools…</p>;

  const initialConfig = draft ? {
    title: draft.title,
    sourcePoolId: draft.sourcePoolId,
    playStyle: draft.playStyle,
    resultMode: draft.resultMode,
    advancementMode: draft.advancementMode,
    tieBreakMode: draft.tieBreakMode,
    audienceMode: draft.visibility === "public_listed" ? "public" : draft.sharingMode === "with_friends" ? "friends" : "private"
  } : {
    resultMode: ["winner_only", "full_ranking", "partial_ranking", "fast_full_rank", "parallel_full_ranking"].includes(searchParams?.get("resultMode") || "")
      ? searchParams.get("resultMode")
      : "winner_only",
    advancementMode: searchParams?.get("advancementMode") === "manual_winner" ? "manual_winner" : "vote_winner",
    playStyle: searchParams?.get("playStyle") === "reseed" ? "reseed" : "fixed_bracket",
    audienceMode: searchParams?.get("audienceMode") === "public"
      ? "public"
      : searchParams?.get("audienceMode") === "friends"
        ? "friends"
        : "private"
  };

  return <BracketCreationWizard pools={pools} initialPoolId={searchParams?.get("poolId") || ""} initialConfig={initialConfig} initialStep={searchParams?.get("step") === "structure" ? 1 : 0} creating={creating} onCancel={() => router.push("/brackets?stage=draft")} onCreate={handleCreate} fullPage />;
}
