import Link from "next/link";
import { SwaggerUiShell } from "@/components/swagger-ui-shell";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { isGoogleAuthConfigured } from "@/lib/auth/options";

export const metadata = {
  title: "API Docs | Brackeroni"
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

function buildSignInHref() {
  return "/api/auth/signin?callbackUrl=%2Fdocs";
}

export default async function DocsPage() {
  const user = await getOptionalCurrentUser();
  const googleConfigured = isGoogleAuthConfigured();

  return (
    <div className="space-y-6">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">API Docs</p>
          <h1 className="display-face mt-2 text-3xl font-black">Swagger UI</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            `Try it out` uses your normal browser session cookies on this site. Sign in here, then
            call protected endpoints directly from the docs.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="text-sm text-[var(--muted)]">
            {user ? (
              <span>
                Signed in as <span className="text-[var(--ink)]">{user.email}</span>
              </span>
            ) : (
              <span>Not signed in.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {user ? null : (
              <Link
                href={buildSignInHref()}
                className={`ui-button ui-button-primary ${googleConfigured ? "" : "pointer-events-none opacity-60"}`}
                title={googleConfigured ? "Sign in with Google" : "Configure Google OAuth first."}
              >
                Sign In
              </Link>
            )}
            <Link href="/api/openapi" className="ui-button ui-button-muted">
              Raw OpenAPI JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border border-[var(--line)] bg-[var(--panel)] p-0">
        <SwaggerUiShell />
      </section>
    </div>
  );
}
