"use client";

import { useCallback, useEffect, useState } from "react";

/** Shared pending and transient-message state for pool-detail mutations. */
export function usePoolDetailStatus() {
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isPending = useCallback((action: string) => Boolean(pendingActions[action]), [pendingActions]);
  const begin = useCallback((action: string) => {
    setPendingActions((current) => ({ ...current, [action]: true }));
  }, []);
  const end = useCallback((action: string) => {
    setPendingActions((current) => ({ ...current, [action]: false }));
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return undefined;

    const timer = window.setTimeout(
      () => {
        setSuccessMessage("");
        setErrorMessage("");
      },
      successMessage ? 2200 : 4200,
    );

    return () => window.clearTimeout(timer);
  }, [errorMessage, successMessage]);

  return { begin, end, errorMessage, isPending, setErrorMessage, setSuccessMessage, successMessage };
}
