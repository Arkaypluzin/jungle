// lib/auth.js
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/azure-ad";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.userId = profile.sub || profile.oid || profile.id;
        token.roles =
          profile.roles ||
          profile._json.roles ||
          profile._json[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ] ||
          [];
      }
      return token;
    },
    async session({ session, token }) {
      session.user.roles = token.roles || [];
      session.user.id = token.userId || null;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
