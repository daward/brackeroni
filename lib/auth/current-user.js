import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { getDb } from "@/lib/db";

const APP_USER_CACHE_TTL_MS = 60_000;
const globalAuthCache = globalThis;
const appUserCache = globalAuthCache.__brackeroniAppUserCache ?? new Map();

if (!globalAuthCache.__brackeroniAppUserCache) {
  globalAuthCache.__brackeroniAppUserCache = appUserCache;
}

function cacheKeyForIdentity(identity) {
  return identity.email.trim().toLowerCase();
}

function identityMatchesCachedUser(cached, identity) {
  return (
    cached.name === identity.name &&
    cached.imageUrl === identity.imageUrl &&
    cached.googleSubject === identity.googleSubject
  );
}

function getCachedUser(identity) {
  const cached = appUserCache.get(cacheKeyForIdentity(identity));

  if (
    cached &&
    cached.expiresAt > Date.now() &&
    identityMatchesCachedUser(cached, identity)
  ) {
    return cached.user;
  }

  return undefined;
}

function cacheUser(identity, user) {
  appUserCache.set(cacheKeyForIdentity(identity), {
    expiresAt: Date.now() + APP_USER_CACHE_TTL_MS,
    name: identity.name,
    imageUrl: identity.imageUrl,
    googleSubject: identity.googleSubject,
    user
  });
}

async function findAppUser(identity) {
  const cached = getCachedUser(identity);
  if (cached !== undefined) {
    return cached;
  }

  const sql = getDb();
  const [user] = await sql`
    select id, email, name, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
    from app_user
    where email = ${identity.email}
    limit 1
  `;

  // Cache a miss too: rendering a public page must not repeatedly query or
  // write an app_user record merely because a session is present.
  cacheUser(identity, user ?? null);
  return user ?? null;
}

async function upsertAppUser({ email, name, imageUrl = null, googleSubject = null }) {
  const identity = { email, name, imageUrl, googleSubject };
  const cached = getCachedUser(identity);

  if (cached !== undefined && cached !== null) {
    return cached;
  }

  const sql = getDb();
  const [user] = await sql`
    with changed_user as (
      insert into app_user (email, name, image_url, google_subject)
      values (${email}, ${name}, ${imageUrl}, ${googleSubject})
      on conflict (email) do update
        set name = excluded.name,
            image_url = excluded.image_url,
            google_subject = coalesce(excluded.google_subject, app_user.google_subject),
            updated_at = now()
        where app_user.name is distinct from excluded.name
          or app_user.image_url is distinct from excluded.image_url
          or (
            excluded.google_subject is not null
            and app_user.google_subject is distinct from excluded.google_subject
          )
      returning id, email, name, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
    )
    select * from changed_user
    union all
    select id, email, name, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
    from app_user
    where email = ${email}
      and not exists (select 1 from changed_user)
    limit 1
  `;

  cacheUser(identity, user);
  return user;
}

function getDevUserFromRequest(request) {
  const email = request?.headers?.get?.("x-dev-user-email") || process.env.DEV_USER_EMAIL;

  if (!email) {
    return null;
  }

  const name =
    request?.headers?.get?.("x-dev-user-name") || process.env.DEV_USER_NAME || email.split("@")[0];

  return {
    email,
    name,
    imageUrl: null,
    googleSubject: null
  };
}

async function getSessionIdentity() {
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!authSecret) {
    return null;
  }

  let session;

  try {
    session = await getServerSession(authOptions);
  } catch {
    return null;
  }

  const email = session?.user?.email?.trim();

  if (!email) {
    return null;
  }

  return {
    email,
    name: session.user.name?.trim() || email.split("@")[0],
    imageUrl: session.user.image || null,
    googleSubject: session.user.googleSubject || null
  };
}

async function getCurrentIdentity(request) {
  return getDevUserFromRequest(request) || (await getSessionIdentity());
}

export async function getOptionalCurrentUser(request) {
  const identity = await getCurrentIdentity(request);

  if (!identity) {
    return null;
  }

  return findAppUser(identity);
}

export async function getCurrentUser(request) {
  const identity = await getCurrentIdentity(request);

  if (!identity) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await findAppUser(identity);
  if (user) {
    return user;
  }

  // First authenticated write/request for a newly signed-in person. This is
  // deliberately not reached by getOptionalCurrentUser during page renders.
  return upsertAppUser(identity);
}

export async function requireCurrentUserPage(callbackPath = "/") {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  return user;
}