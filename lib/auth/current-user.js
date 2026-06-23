import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { getDb } from "@/lib/db";

async function upsertAppUser({ email, name, imageUrl = null, googleSubject = null }) {
  const sql = getDb();

  const [user] = await sql`
    insert into app_user (email, name, image_url, google_subject)
    values (${email}, ${name}, ${imageUrl}, ${googleSubject})
    on conflict (email) do update
      set name = excluded.name,
          image_url = excluded.image_url,
          google_subject = coalesce(excluded.google_subject, app_user.google_subject),
          updated_at = now()
    returning id, email, name, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
  `;

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

export async function getOptionalCurrentUser(request) {
  const devUser = getDevUserFromRequest(request);
  const identity = devUser || (await getSessionIdentity());

  if (!identity) {
    return null;
  }

  return upsertAppUser(identity);
}

export async function getCurrentUser(request) {
  const user = await getOptionalCurrentUser(request);

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireCurrentUserPage(callbackPath = "/") {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  return user;
}
