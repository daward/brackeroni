"use client";

import Link from "next/link";
import { BookmarkletInstaller } from "@/components/bookmarklet-installer";

function UseCaseSteps({ steps }) {
  return (
    <ol className="mt-4 grid gap-4">
      {steps.map((step, index) => {
        const key =
          typeof step === "string"
            ? step
            : `${step.title || step.text}-${index}`;

        return (
          <li key={key} className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <span className="display-face text-3xl font-black leading-none text-[var(--accent-2)]">
              {index + 1}
            </span>
            <div className="space-y-3">
              {typeof step === "object" && step.title ? (
                <p className="text-lg font-semibold leading-none text-[var(--foreground)]">
                  {step.title}
                </p>
              ) : null}
              <p className="ui-copy text-base leading-7 text-[var(--muted)]">
                {typeof step === "string" ? step : step.text}
              </p>
              {typeof step === "object" && step.href ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-3)] underline decoration-[rgba(52,211,196,0.4)] underline-offset-4 transition hover:text-[var(--accent-2)]"
                >
                  {step.linkLabel || step.hrefLabel || "Open link"}
                </a>
              ) : null}
              {typeof step === "object" && step.bookmarklet ? (
                <div className="space-y-2">
                  {step.bookmarklet.label ? (
                    <p className="ui-copy text-sm leading-6 text-[var(--muted)]">
                      {step.bookmarklet.label}
                    </p>
                  ) : null}
                  <BookmarkletInstaller
                    origin={step.bookmarklet.origin}
                    poolId={step.bookmarklet.poolId ?? null}
                    poolName={step.bookmarklet.poolName ?? null}
                    showInstructions={false}
                    showIntroCopy={false}
                    showCopyButton={false}
                  />
                </div>
              ) : null}
              {typeof step === "object" && step.action ? (
                <div>
                  <Link
                    href={step.action.href}
                    className={step.action.className || "ui-button ui-button-accent"}
                  >
                    {step.action.label}
                  </Link>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function UseCaseResultPreview({ preview }) {
  if (!preview) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-[var(--line)] pt-4">
      <p className="ui-section-kicker">{preview.kicker || "Example Result"}</p>
      <div className="mt-4 grid gap-4">
        {preview.items.map((item) => (
          <div key={item.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-[var(--accent-3)]">
              {item.label}:
            </p>
            <p className="ui-copy text-sm leading-6 text-[var(--muted)]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UseCasePage({
  title,
  storyParagraphs,
  storyContent = null,
  bookmarklet,
  example = null,
  steps = [],
  stepsFooter = null,
  summary,
  cta,
  secondaryCta = null,
  resultPreview = null,
  kicker = null,
  storyKicker = "The Story",
  exampleKicker = "Example",
  stepsKicker = "How It Works",
  startKicker = "Start Here",
  startContent = null,
  stepsLayout = "split"
}) {
  const useAsideStepsLayout = stepsLayout === "aside";
  const showStartPanel =
    stepsLayout === "split" && (bookmarklet || startContent || cta || secondaryCta);
  const hasExampleSection = Boolean(example || resultPreview);
  const hasStepsSection = steps.length > 0 || summary || showStartPanel;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-black uppercase leading-none sm:text-4xl">{title}</h1>
        {kicker ? (
          <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
            {kicker}
          </p>
        ) : null}
      </div>

      <section className="border border-[var(--line-strong)]">
        <div
          className={`grid gap-0 ${
            useAsideStepsLayout && hasStepsSection
              ? "lg:grid-cols-[1.02fr_0.98fr]"
              : hasStepsSection
                ? "lg:grid-cols-[1.05fr_0.95fr]"
                : ""
          }`}
        >
          <div
            className={
              useAsideStepsLayout && hasStepsSection
                ? "lg:border-r lg:border-[var(--line-strong)]"
                : ""
            }
          >
            <div
              className={
                hasExampleSection
                  ? "border-b border-[var(--line-strong)] p-6 sm:p-8"
                  : "p-6 sm:p-8"
              }
            >
              <p className="ui-section-kicker">{storyKicker}</p>
              {storyContent ? (
                <div className="mt-4 max-w-xl">{storyContent}</div>
              ) : (
                <div className="max-w-xl space-y-5">
                  {(storyParagraphs || []).map((paragraph, index) => (
                    <p
                      key={paragraph}
                      className={`ui-copy text-base leading-7 text-[var(--muted)] ${
                        index === 0 ? "mt-4" : ""
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {hasExampleSection ? (
              <div className="bg-[rgba(255,255,255,0.02)] p-6 sm:p-8">
                <p className="ui-section-kicker">{exampleKicker}</p>
                {example?.title ? (
                  <h2 className="mt-3 text-3xl font-black uppercase leading-none">
                    {example.title}
                  </h2>
                ) : null}
                {example?.description ? (
                  <p className="ui-copy mt-5 max-w-md text-base leading-7 text-[var(--muted)]">
                    {example.description}
                  </p>
                ) : null}
                {example?.content ? <div className="mt-5">{example.content}</div> : null}
                <UseCaseResultPreview preview={resultPreview} />
              </div>
            ) : null}
          </div>

          {hasStepsSection ? (
            <div
              className={
                useAsideStepsLayout
                  ? "bg-[rgba(255,255,255,0.02)] p-6 sm:p-8"
                  : "border-t border-[var(--line-strong)] p-6 sm:p-8"
              }
            >
              <div className={`grid gap-8 ${stepsLayout === "split" ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}>
                <div>
                  <p className="ui-section-kicker">{stepsKicker}</p>
                  {steps.length > 0 ? <UseCaseSteps steps={steps} /> : null}
                  {stepsFooter ? <div className="mt-6">{stepsFooter}</div> : null}
                  {summary ? (
                    <p className="ui-meta mt-6 max-w-sm text-[var(--accent-3)]">{summary}</p>
                  ) : null}
                </div>
                {showStartPanel ? (
                  <div>
                    <p className="ui-section-kicker">{startKicker}</p>
                    {startContent ? <div className="mt-4 max-w-lg">{startContent}</div> : null}
                    {bookmarklet ? (
                      <div className="mt-4 max-w-lg">
                        <BookmarkletInstaller
                          origin={bookmarklet.origin}
                          poolId={bookmarklet.poolId ?? null}
                          poolName={bookmarklet.poolName ?? null}
                          showInstructions={bookmarklet.showInstructions ?? false}
                          copyTextClassName={bookmarklet.copyTextClassName ?? "text-base leading-7"}
                        />
                      </div>
                    ) : null}
                    {cta || secondaryCta ? (
                      <div className="mt-6 flex flex-wrap gap-3">
                        {cta ? (
                          <Link href={cta.href} className={cta.className || "ui-button ui-button-accent"}>
                            {cta.label}
                          </Link>
                        ) : null}
                      {secondaryCta ? (
                        <Link
                          href={secondaryCta.href}
                          className={secondaryCta.className || "ui-button ui-button-muted"}
                        >
                          {secondaryCta.label}
                        </Link>
                      ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
