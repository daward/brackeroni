"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isParallelResultMode } from "@/lib/bracket-modes";
import { createParallelTournament, createPool, createTournament, updateTournament } from "@/lib/client-api/create-workspace";
import type { BracketSetupDraft } from "@/lib/brackets/types";
import type { BracketCreationInput } from "../types";

type AudienceMode = "private" | "friends" | "public";

function getAudiencePayload(audienceMode: AudienceMode) {
  if (audienceMode === "friends") {
    return { sharingMode: "with_friends", visibility: "private", votingAccess: "signed_in_only" };
  }
  if (audienceMode === "public") {
    return { sharingMode: "private", visibility: "public_listed", votingAccess: "anyone" };
  }
  return { sharingMode: "private", visibility: "private", votingAccess: "signed_in_only" };
}

export function useNewBracketSubmission(draft: BracketSetupDraft | null) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createBracket(input: BracketCreationInput) {
    setCreating(true);
    try {
      const pool = await getSubmissionPool(input);
      const audience = getAudiencePayload(input.audienceMode);
      const payload = {
        title: input.title || `${pool.name} Bracket`,
        description: null,
        sourcePoolId: pool.id,
        playStyle: input.playStyle,
        resultMode: input.resultMode,
        advancementMode: input.advancementMode,
        tieBreakMode: input.tieBreakMode,
        seedCandidateIds: input.seedingMode === "custom" ? input.seedCandidateIds : undefined,
        ...audience,
      };

      const data = await submitBracket(input, payload, draft);

      router.push("/brackets?stage=draft");
      return data.item;
    } catch {
      return null;
    } finally {
      setCreating(false);
    }
  }

  return { creating, createBracket };
}

async function submitBracket(
  input: BracketCreationInput,
  payload: {
    title: string;
    description: null;
    sourcePoolId: string;
    playStyle: BracketCreationInput["playStyle"];
    resultMode: BracketCreationInput["resultMode"];
    advancementMode: BracketCreationInput["advancementMode"];
    tieBreakMode: BracketCreationInput["tieBreakMode"];
    seedCandidateIds?: string[] | null;
    sharingMode: string;
    visibility: string;
    votingAccess: string;
  },
  draft: BracketSetupDraft | null,
) {
  if (isParallelResultMode(input.resultMode)) {
    return createParallelTournament({
      title: payload.title,
      description: payload.description,
      sourcePoolId: payload.sourcePoolId,
      sharingMode: payload.sharingMode,
      visibility: payload.visibility,
      votingAccess: payload.votingAccess,
      playStyle: input.playStyle,
      resultMode: input.resultMode,
      tieBreakMode: input.tieBreakMode,
    });
  }

  if (draft) {
    return updateTournament(draft.id, payload);
  }

  return createTournament(payload);
}

async function getSubmissionPool(input: BracketCreationInput) {
  if (input.source.type === "existing") {
    return input.source.pool;
  }

  const data = await createPool({
    name: input.source.name,
    description: null,
    visibility: "private",
    source: {
      type: "items",
      items: input.source.candidates.map(({ name, description, imageUrl, tags }) => ({
        name,
        description,
        imageUrl,
        tags,
      })),
    },
  });

  return data.item;
}
