import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { isAdminUser } from "@/lib/auth/admin";
import { isGoogleAuthConfigured } from "@/lib/auth/options";

export const metadata = {
  title: "Brackeroni",
  description: "Bracket-driven decision making."
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }) {
  const user = await getOptionalCurrentUser();
  const isDevShimActive = Boolean(process.env.DEV_USER_EMAIL);
  const isAdmin = isAdminUser(user);

  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8">
          <MainNav
            user={user}
            googleConfigured={isGoogleAuthConfigured()}
            isDevShimActive={isDevShimActive}
            isAdmin={isAdmin}
          />
          <main className="flex-1 py-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
