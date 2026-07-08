"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildGenericPageImportPrompt } from "@/lib/bookmarklets/prompt";

const IMPORT_PAYLOAD_STORAGE_KEY = "brackeroni-import-payload";
const IMPORT_PAYLOAD_MESSAGE_TYPE = "BRACKERONI_IMPORT_PAYLOAD";
const IMPORT_READY_MESSAGE_TYPE = "BRACKERONI_IMPORT_READY";

function extractPayloadFromWindow() {
  try {
    const stored = window.sessionStorage.getItem(IMPORT_PAYLOAD_STORAGE_KEY);
    if (stored) {
      window.sessionStorage.removeItem(IMPORT_PAYLOAD_STORAGE_KEY);
      return JSON.parse(stored);
    }
  } catch {}

  try {
    if (window.name) {
      const parsed = JSON.parse(window.name);
      window.name = "";
      return parsed;
    }
  } catch {}

  const searchParams = new URLSearchParams(window.location.search);
  const encoded = searchParams.get("payload");

  if (!encoded) {
    return null;
  }

  try {
    return JSON.parse(encoded);
  } catch {
    return null;
  }
}

function buildImportHtml(payload) {
  const capturedHtml = payload?.html?.trim() || "";
  const selectionHtml = payload?.selectionHtml?.trim() || "";

  if (capturedHtml) {
    return capturedHtml;
  }

  return selectionHtml || null;
}

function buildCaptureDiagnostics(payload) {
  if (!payload?.debug) {
    return null;
  }

  return JSON.stringify(payload.debug, null, 2);
}

function extractLastCapturedCandidateFromHtml(html) {
  const sourceHtml = String(html || "").trim();
  if (!sourceHtml || typeof window === "undefined" || typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div data-import-root="true">${sourceHtml}</div>`, "text/html");
    const root = doc.querySelector("[data-import-root='true']");
    if (!root) {
      return null;
    }

    const candidateRoots = Array.from(root.children).filter((element) => {
      const text = element.textContent?.trim() || "";
      return text.length > 0;
    });
    const lastRoot =
      candidateRoots[candidateRoots.length - 1] ||
      root.lastElementChild;

    if (!lastRoot) {
      return null;
    }

    const title =
      lastRoot.querySelector("h1, h2, h3, h4, [title], a")?.getAttribute?.("title") ||
      lastRoot.querySelector("h1, h2, h3, h4, a")?.textContent?.trim() ||
      "";
    const href = lastRoot.querySelector("a[href]")?.getAttribute("href") || "";
    const imageUrl =
      lastRoot.querySelector("img[src]")?.getAttribute("src") ||
      lastRoot.querySelector("img[srcset]")?.getAttribute("srcset")?.split(",")?.[0]?.trim()?.split(" ")?.[0] ||
      "";
    const metadata = Array.from(lastRoot.querySelectorAll("span, p, div"))
      .map((element) => element.textContent?.trim() || "")
      .filter((value) => value && value !== title)
      .slice(0, 3)
      .join(" • ");

    if (!title) {
      return null;
    }

    return {
      title,
      href,
      imageUrl,
      metadata
    };
  } catch {
    return null;
  }
}

function buildContinuationSourceUrl(pageUrl, poolId, poolName, captureCursor = null) {
  if (!pageUrl || !poolId) {
    return null;
  }

  try {
    const url = new URL(pageUrl);
    const hashParams = new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.hash
    );
    hashParams.set("brackeroni-continue-pool", poolId);

    if (poolName) {
      hashParams.set("brackeroni-continue-name", poolName);
    }

    if (captureCursor?.mode) {
      hashParams.set("brackeroni-continue-mode", captureCursor.mode);
    } else {
      hashParams.delete("brackeroni-continue-mode");
    }

    if (captureCursor?.selector) {
      hashParams.set("brackeroni-continue-selector", captureCursor.selector);
    } else {
      hashParams.delete("brackeroni-continue-selector");
    }

    if (captureCursor?.lastKey) {
      hashParams.set("brackeroni-continue-last-key", captureCursor.lastKey);
    } else {
      hashParams.delete("brackeroni-continue-last-key");
    }

    if (captureCursor?.lastTitle) {
      hashParams.set("brackeroni-continue-last-title", captureCursor.lastTitle);
    } else {
      hashParams.delete("brackeroni-continue-last-title");
    }

    if (Number.isFinite(captureCursor?.emittedCount) && captureCursor.emittedCount > 0) {
      hashParams.set("brackeroni-continue-count", String(captureCursor.emittedCount));
    } else {
      hashParams.delete("brackeroni-continue-count");
    }

    url.hash = hashParams.toString();
    return url.toString();
  } catch {
    return null;
  }
}

function navigateToContinuationSource(url) {
  if (!url || typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank");
}

function LastCapturedCandidateCard({ item }) {
  if (!item?.title) {
    return null;
  }

  return (
    <div className="grid gap-4 border border-[var(--line)] bg-[var(--panel)] p-4 sm:grid-cols-[120px_1fr]">
      {item.imageUrl ? (
        <div className="overflow-hidden border border-[var(--line)] bg-[var(--panel-2)]">
          <img src={item.imageUrl} alt="" className="h-[120px] w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-[120px] items-center justify-center border border-[var(--line)] bg-[var(--panel-2)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          No Image
        </div>
      )}
      <div className="space-y-2">
        <p className="ui-meta text-[var(--accent-3)]">Last Candidate Found</p>
        <p className="display-face text-xl font-black text-[var(--ink)]">{item.title}</p>
        {item.metadata ? (
          <p className="text-sm leading-6 text-[var(--muted)]">{item.metadata}</p>
        ) : null}
        {item.href ? (
          <p className="break-all text-xs leading-5 text-[var(--muted)]">{item.href}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ImportPoolReview() {
  const [payload, setPayload] = useState(undefined);
  const [poolName, setPoolName] = useState("");
  const [description, setDescription] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [usePageUrlAssist, setUsePageUrlAssist] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdPoolId, setCreatedPoolId] = useState(null);
  const [continueSourceUrl, setContinueSourceUrl] = useState(null);
  const [poolCandidateCount, setPoolCandidateCount] = useState(null);
  const [lastCapturedStatus, setLastCapturedStatus] = useState(null);
  const isContinuation = Boolean(payload?.continuePoolId);

  const importedHtml = useMemo(() => buildImportHtml(payload), [payload]);
  const captureDiagnostics = useMemo(() => buildCaptureDiagnostics(payload), [payload]);
  const lastCapturedItem = useMemo(() => {
    return (
      extractLastCapturedCandidateFromHtml(importedHtml) ||
      payload?.captureCursor?.lastItem ||
      null
    );
  }, [importedHtml, payload]);

  useEffect(() => {
    function applyPayload(nextPayload) {
      setPayload(nextPayload);
      setPoolName(
        nextPayload?.continuePoolName?.trim() ||
          nextPayload?.pageTitle?.trim()?.slice(0, 120) ||
          "Imported Pool"
      );
      setDescription(nextPayload?.pageUrl ? `Imported from ${new URL(nextPayload.pageUrl).hostname}` : "");
      setUsePageUrlAssist(
        !/boardgamearena\.com$/i.test(new URL(nextPayload?.pageUrl || "http://localhost").hostname)
      );
      setContinueSourceUrl(
        buildContinuationSourceUrl(
          nextPayload?.pageUrl,
          nextPayload?.continuePoolId || null,
          nextPayload?.continuePoolName || null,
          nextPayload?.captureCursor || null
        )
      );
    }

    const nextPayload = extractPayloadFromWindow();

    if (nextPayload) {
      applyPayload(nextPayload);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPayload(null);
    }, 4000);

    function handleMessage(event) {
      if (event.data?.type !== IMPORT_PAYLOAD_MESSAGE_TYPE || !event.data?.payload) {
        return;
      }

      try {
        window.sessionStorage.setItem(
          IMPORT_PAYLOAD_STORAGE_KEY,
          JSON.stringify(event.data.payload)
        );
      } catch {}

      window.clearTimeout(timer);
      applyPayload(event.data.payload);
    }

    window.addEventListener("message", handleMessage);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: IMPORT_READY_MESSAGE_TYPE
          },
          "*"
        );
      }
    } catch {}

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const sourceMode = useMemo(() => {
    if (!payload) {
      return null;
    }

    return payload?.debug?.capture?.chosenSource || (payload.selectionHtml?.trim() ? "selection-html" : "html");
  }, [payload]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!payload || submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedPoolId(payload.continuePoolId || null);
    setPoolCandidateCount(null);
    setLastCapturedStatus(null);

    try {
      const source = {
        type: "extract",
        prompt: buildGenericPageImportPrompt({
          poolName,
          pageTitle: payload.pageTitle,
          pageUrl: payload.pageUrl,
          extraInstructions
        }),
        pageTitle: payload.pageTitle || null,
        pageUrl: payload.pageUrl || null,
        text: payload.text?.trim() || null,
        html: importedHtml,
        urls: usePageUrlAssist && payload.pageUrl ? [payload.pageUrl] : []
      };
      const requestUrl = payload.continuePoolId
        ? `/api/pools/${payload.continuePoolId}/imports`
        : "/api/pools";
      const requestBody = payload.continuePoolId
        ? { source }
        : {
            name: poolName,
            description: description || null,
            source
          };
      const actualResponse = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await actualResponse.json();

      if (!actualResponse.ok) {
        throw new Error(data?.error?.message || "Import failed.");
      }

      if (payload.continuePoolId) {
        setSuccessMessage(
          `Added ${data.meta?.importedCount ?? "?"} candidates and skipped ${data.meta?.skippedCount ?? "?"} duplicates.`
        );
      } else {
        setSuccessMessage(
          `Imported "${data.item?.name || poolName}" with ${data.item?.candidateCount ?? "?"} candidates.`
        );
      }
      setCreatedPoolId(data.item?.id || payload.continuePoolId || null);
      setPoolCandidateCount(
        Number.isFinite(data.item?.candidateCount) ? data.item.candidateCount : null
      );
      const normalizedLastCapturedName = lastCapturedItem?.title?.trim().toLowerCase() || "";
      const importedNames = Array.isArray(data.meta?.importedNames) ? data.meta.importedNames : [];
      const skippedNames = Array.isArray(data.meta?.skippedNames) ? data.meta.skippedNames : [];
      if (normalizedLastCapturedName) {
        if (skippedNames.some((name) => name?.trim().toLowerCase() === normalizedLastCapturedName)) {
          setLastCapturedStatus("skipped");
        } else if (
          importedNames.some((name) => name?.trim().toLowerCase() === normalizedLastCapturedName)
        ) {
          setLastCapturedStatus("imported");
        }
      }
      setContinueSourceUrl(
        buildContinuationSourceUrl(
          payload.pageUrl,
          data.item?.id || payload.continuePoolId || null,
          data.item?.name || poolName,
          payload.captureCursor || null
        )
      );
    } catch (error) {
      setErrorMessage(error.message || "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (payload === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-7 text-[var(--muted)]">Waiting for import payload...</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-7 text-[var(--muted)]">
          No import payload was found. Open this page from the bookmarklet installer and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="grid gap-px border-b border-[var(--line)] bg-[var(--line)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[var(--panel)] px-5 py-5">
            <p className="display-face text-lg font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
              Import To Pool
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Review the captured page content, adjust any extra instructions if needed, and import
              this batch into the pool.
            </p>
          </div>
          <div className="flex items-center justify-start bg-[var(--panel-3)] px-5 py-5 lg:justify-end">
            <button
              type="button"
              onClick={() => document.getElementById("import-pool-form")?.requestSubmit()}
              disabled={submitting || Boolean(successMessage)}
              className="ui-button ui-button-accent-fill"
            >
              {submitting ? "Importing" : "Import To Pool"}
            </button>
          </div>
        </div>
        {successMessage ? (
          <div className="border-t border-[var(--line)] bg-[var(--panel-3)] px-5 py-5">
            <div className="space-y-3 border border-[var(--accent-3)] bg-[var(--panel)] px-4 py-4">
              <p className="text-sm text-[var(--accent-3)]">{successMessage}</p>
              {poolCandidateCount !== null ? (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  <span className="ui-meta text-[var(--accent-3)]">Pool size</span>:{" "}
                  {poolCandidateCount} candidates
                </p>
              ) : null}
              {lastCapturedItem ? (
                <div className="space-y-2">
                  <LastCapturedCandidateCard item={lastCapturedItem} />
                  {lastCapturedStatus === "skipped" ? (
                    <p className="text-sm leading-6 text-[var(--warn)]">
                      This captured candidate was skipped as a duplicate.
                    </p>
                  ) : null}
                  {lastCapturedStatus === "imported" ? (
                    <p className="text-sm leading-6 text-[var(--accent-3)]">
                      This captured candidate was imported in this batch.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm leading-6 text-[var(--muted)]">
                Continue importing from the source page?
              </p>
              <div className="flex flex-wrap gap-3">
                {continueSourceUrl ? (
                  <button
                    type="button"
                    onClick={() => navigateToContinuationSource(continueSourceUrl)}
                    className="ui-button ui-button-accent-fill"
                  >
                    Continue Import
                  </button>
                ) : null}
                {createdPoolId ? (
                  <Link
                    href={`/create?view=pools&pool=${encodeURIComponent(createdPoolId)}`}
                    className="ui-button ui-button-muted"
                  >
                    Go To Pool
                  </Link>
                ) : null}
                <Link href="/import" className="ui-button ui-button-muted">
                  Import Another Page
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border border-[var(--line)] bg-[var(--panel)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-3">
            <h2 className="display-face text-lg font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
              Import Review
            </h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <form id="import-pool-form" className="space-y-4" onSubmit={handleSubmit}>
              <input
                value={poolName}
                onChange={(event) => setPoolName(event.target.value)}
                placeholder="Pool name"
                disabled={Boolean(payload.continuePoolId)}
                className="ui-field ui-field-modal"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Pool description"
                rows={2}
                disabled={Boolean(payload.continuePoolId)}
                className="ui-field ui-field-modal"
              />
              <textarea
                value={extraInstructions}
                onChange={(event) => setExtraInstructions(event.target.value)}
                placeholder='Extra import instructions, e.g. "Ignore defunct attractions and only include currently operating rides."'
                rows={3}
                className="ui-field ui-field-modal"
              />
              <div className="space-y-2 text-sm leading-6 text-[var(--muted)]">
                <p>
                  <span className="ui-meta text-[var(--accent-3)]">Source</span>:{" "}
                  {payload.pageTitle || "Untitled page"}
                </p>
                <p className="break-all">
                  <span className="ui-meta text-[var(--accent-3)]">URL</span>: {payload.pageUrl}
                </p>
                <p>
                  <span className="ui-meta text-[var(--accent-3)]">Mode</span>:{" "}
                  {sourceMode === "selection" ? "Selected HTML" : "Captured page HTML"}
                </p>
                {payload.continuePoolId ? (
                  <p>
                    <span className="ui-meta text-[var(--accent-3)]">Appending to</span>:{" "}
                    {payload.continuePoolName || payload.continuePoolId}
                  </p>
                ) : null}
                {payload.continuePoolId ? (
                  <p>
                    <span className="ui-meta text-[var(--accent-3)]">Import scope</span>:{" "}
                    bookmarklet resume or highlighted continuation section
                  </p>
                ) : null}
                {captureDiagnostics ? (
                  <details className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
                    <summary className="cursor-pointer ui-meta text-[var(--accent-3)]">
                      Capture diagnostics
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap break-all text-xs leading-5 text-[var(--muted)]">
                      {captureDiagnostics}
                    </pre>
                  </details>
                ) : null}
              </div>
              <label className="flex items-start gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={usePageUrlAssist}
                  onChange={(event) => setUsePageUrlAssist(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  Also use the page URL when it is publicly accessible. This helps on sites like
                  Wikipedia, Billboard, and Tripadvisor, but should usually stay off for private
                  pages like Board Game Arena history.
                </span>
              </label>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Add optional guidance here when you want the model to ignore sections, narrow the
                scope, or favor one interpretation of the page.
              </p>
            </form>
            {errorMessage ? (
              <p className="border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)]">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </section>

        <section className="border border-[var(--line)] bg-[var(--panel)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-3">
            <h2 className="display-face text-lg font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
              Captured Content
            </h2>
          </div>
          <div className="px-5 py-5">
            <div className="ui-scroll-subtle max-h-[32rem] w-full overflow-auto rounded-sm border border-[var(--line)] bg-[var(--panel-3)] p-4">
              <pre className="w-full max-w-[72ch] whitespace-pre-wrap break-all text-sm leading-6 text-[var(--muted)]">
                {importedHtml || ""}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
