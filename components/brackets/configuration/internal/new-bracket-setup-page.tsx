"use client";

import { useRouter } from "next/navigation";
import { BracketCreationWizard } from "./bracket-creation-wizard";
import type { AudienceMode, BracketCreationWizardProps, NewBracketSetupPageProps, ResultMode } from "../types";
import { useBracketSetupData } from "./use-bracket-setup-data";
import { useNewBracketSubmission } from "./use-new-bracket-submission";

type InitialConfig = BracketCreationWizardProps["initialConfig"];
type SetupData = ReturnType<typeof useBracketSetupData>;

function getAudienceMode(visibility?: string | null, sharingMode?: string | null): AudienceMode {
  if (visibility === "public_listed") return "public";
  if (sharingMode === "with_friends") return "friends";
  return "private";
}

function getSearchAudienceMode(value: string | null): AudienceMode {
  if (value === "public") return "public";
  if (value === "friends") return "friends";
  return "private";
}

function getInitialResultMode(value: string): ResultMode {
  return ["winner_only", "full_ranking", "partial_ranking", "fast_full_rank", "parallel_full_ranking"].includes(value) ? (value as ResultMode) : "winner_only";
}

function getInitialConfig(draft: SetupData["draft"], searchParams: SetupData["searchParams"]): InitialConfig {
  if (draft) {
    return {
      title: draft.title,
      sourcePoolId: draft.sourcePoolId ?? undefined,
      playStyle: draft.playStyle ?? undefined,
      resultMode: draft.resultMode ?? undefined,
      advancementMode: draft.advancementMode ?? undefined,
      tieBreakMode: draft.tieBreakMode ?? undefined,
      audienceMode: getAudienceMode(draft.visibility, draft.sharingMode),
    };
  }

  return {
    resultMode: getInitialResultMode(searchParams?.get("resultMode") || ""),
    advancementMode: searchParams?.get("advancementMode") === "manual_winner" ? "manual_winner" : "vote_winner",
    playStyle: searchParams?.get("playStyle") === "reseed" ? "reseed" : "fixed_bracket",
    audienceMode: getSearchAudienceMode(searchParams?.get("audienceMode") ?? null),
  };
}

export function NewBracketSetupPage({ draftId: routeDraftId = null }: NewBracketSetupPageProps) {
  const router = useRouter();
  const { searchParams, pools, draft, loading } = useBracketSetupData(routeDraftId);
  const { creating, createBracket } = useNewBracketSubmission(draft);

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading your pools...</p>;

  return (
    <BracketCreationWizard
      pools={pools}
      initialPoolId={searchParams?.get("poolId") || ""}
      initialConfig={getInitialConfig(draft, searchParams)}
      initialStep={searchParams?.get("step") === "structure" ? 1 : 0}
      creating={creating}
      onCancel={() => router.push("/brackets?stage=draft")}
      onCreate={createBracket}
      onCreatePoolWorkspace={undefined}
      fullPage
    />
  );
}
