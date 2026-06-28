import { redirect } from "next/navigation";
import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";

const ADMIN_EMAILS = new Set(["acheron0@gmail.com"]);

export function isAdminUser(user) {
  const email = user?.email?.trim().toLowerCase();
  return Boolean(email && ADMIN_EMAILS.has(email));
}

export async function requireAdminUser(request) {
  const user = await getCurrentUser(request);

  if (!isAdminUser(user)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireAdminPage(callbackPath = "/admin") {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (!isAdminUser(user)) {
    redirect("/");
  }

  return user;
}
