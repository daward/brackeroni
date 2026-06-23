import GoogleProvider from "next-auth/providers/google";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

export const authOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  providers: googleConfigured
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        })
      ]
    : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google") {
        token.googleSubject = profile?.sub || account.providerAccountId || token.googleSubject || null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.googleSubject = token.googleSubject || null;
      }

      return session;
    }
  }
};

export function isGoogleAuthConfigured() {
  return googleConfigured;
}
