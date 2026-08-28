"use client";

import { useCallback, useEffect, useState } from "react";
import { getAutomaticImageSuggestionQuery } from "@/components/pools/shared";
import { suggestImages } from "@/lib/client-api/create-workspace";
import type { ImageSuggestion } from "@/components/pools/candidates";

type ImageSuggestionsResponse = { items?: ImageSuggestion[] };

function getErrorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useCandidateImageSuggestions({ candidateId, candidateName, onError }: { candidateId?: string | null; candidateName: string; onError: (message: string) => void }) {
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestion[]>([]);
  const [isImageSuggestionLoading, setIsImageSuggestionLoading] = useState(false);
  const [completedQuery, setCompletedQuery] = useState("");
  const resetImageSuggestions = useCallback(() => {
    setImageSuggestions([]);
    setCompletedQuery("");
  }, []);
  const suggestCandidateImages = useCallback(
    async ({ force = false } = {}) => {
      const query = candidateName.trim();
      if (query.length < 2 || isImageSuggestionLoading || (!force && completedQuery === query)) return;
      setIsImageSuggestionLoading(true);
      try {
        const data: ImageSuggestionsResponse = await suggestImages(query);
        setImageSuggestions(data.items || []);
        setCompletedQuery(query);
      } catch (error) {
        onError(getErrorText(error, "Failed to fetch image suggestions."));
      } finally {
        setIsImageSuggestionLoading(false);
      }
    },
    [candidateName, completedQuery, isImageSuggestionLoading, onError],
  );

  useEffect(() => {
    if (!getAutomaticImageSuggestionQuery({ candidateId, candidateName, completedQuery, isLoading: isImageSuggestionLoading })) return undefined;
    const timer = window.setTimeout(() => {
      void suggestCandidateImages();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [candidateId, candidateName, completedQuery, isImageSuggestionLoading, suggestCandidateImages]);

  return { imageSuggestions, isImageSuggestionLoading, resetImageSuggestions, suggestCandidateImages };
}
