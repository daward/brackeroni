"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildGenericPageImportPrompt } from "@/lib/bookmarklets/prompt";
import { analyzeCapturedHtml } from "@/lib/import/capture-analysis";

function extractPayloadFromWindow() {
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

export function ImportPoolReview() {
  const [payload, setPayload] = useState(null);
  const [poolName, setPoolName] = useState("");
  const [description, setDescription] = useState("");
  const [usePageUrlAssist, setUsePageUrlAssist] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdPoolId, setCreatedPoolId] = useState(null);
  const [importWarnings, setImportWarnings] = useState([]);

  useEffect(() => {
    const nextPayload = extractPayloadFromWindow();
    setPayload(nextPayload);
    setPoolName(nextPayload?.pageTitle?.trim()?.slice(0, 120) || "Imported Pool");
    setDescription(nextPayload?.pageUrl ? `Imported from ${new URL(nextPayload.pageUrl).hostname}` : "");
    setUsePageUrlAssist(!/boardgamearena\.com$/i.test(new URL(nextPayload?.pageUrl || "http://localhost").hostname));
  }, []);

  const sourceMode = useMemo(() => {
    if (!payload) {
      return null;
    }

    return payload.selectionHtml?.trim() ? "selection" : "html";
  }, [payload]);

  const captureWarnings = useMemo(
    () =>
      analyzeCapturedHtml({
        html: payload?.selectionHtml?.trim() || payload?.html || "",
        pageUrl: payload?.pageUrl || null
      }),
    [payload]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (!payload || submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    setCreatedPoolId(null);
    setImportWarnings([]);

    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: poolName,
          description: description || null,
          source: {
            type: "extract",
            prompt: buildGenericPageImportPrompt({
              poolName,
              pageTitle: payload.pageTitle,
              pageUrl: payload.pageUrl
            }),
            pageTitle: payload.pageTitle || null,
            pageUrl: payload.pageUrl || null,
            text: null,
            html: payload.selectionHtml?.trim() || payload.html || null,
            urls: usePageUrlAssist && payload.pageUrl ? [payload.pageUrl] : []
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || "Import failed.");
      }

      setSuccessMessage(
        `Imported "${data.item?.name || poolName}" with ${data.item?.candidateCount ?? "?"} candidates.`
      );
      setCreatedPoolId(data.item?.id || null);
      setImportWarnings(data.meta?.importWarnings || []);
    } catch (error) {
      setErrorMessage(error.message || "Import failed.");
    } finally {
      setSubmitting(false);
    }
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
              Ready To Build
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Review the captured page content, adjust the pool name if needed, and build the pool
              when it looks right.
            </p>
          </div>
          <div className="flex items-center justify-start bg-[var(--panel-3)] px-5 py-5 lg:justify-end">
            {createdPoolId ? (
              <Link
                href={`/create?view=pools&pool=${encodeURIComponent(createdPoolId)}`}
                className="ui-button ui-button-accent-fill"
              >
                Go To Imported Pool
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("import-pool-form")?.requestSubmit()}
                disabled={submitting}
                className="ui-button ui-button-accent-fill"
              >
                {submitting ? "Importing" : "Build Pool"}
              </button>
            )}
          </div>
        </div>
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
                className="ui-field ui-field-modal"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Pool description"
                rows={2}
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
              {captureWarnings.length > 0 ? (
                <div className="space-y-2 border border-[var(--accent-2)] bg-[var(--panel-2)] px-4 py-3">
                  {captureWarnings.map((warning) => (
                    <p key={warning.code} className="text-sm leading-6 text-[var(--accent-2)]">
                      {warning.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </form>
            {errorMessage ? (
              <p className="border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)]">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <div className="space-y-3 border border-[var(--accent-3)] bg-[var(--panel-3)] px-4 py-3">
                <p className="text-sm text-[var(--accent-3)]">{successMessage}</p>
                {importWarnings.length > 0 ? (
                  <div className="space-y-2 border border-[var(--accent-2)] bg-[var(--panel-2)] px-4 py-3">
                    {importWarnings.map((warning) => (
                      <p key={warning.code} className="text-sm leading-6 text-[var(--accent-2)]">
                        {warning.message}
                      </p>
                    ))}
                  </div>
                ) : null}
                {createdPoolId ? (
                  <Link href="/import" className="ui-button ui-button-muted">
                    Import Another Page
                  </Link>
                ) : null}
              </div>
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
                {payload.selectionHtml?.trim() || payload.html || ""}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
