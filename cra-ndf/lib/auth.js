// lib/auth.js
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/azure-ad";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
      // Assurez-vous que les scopes nécessaires sont inclus pour obtenir le nom de l'utilisateur
      // 'profile' et 'email' sont généralement suffisants pour le nom et l'email
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      console.log(
        "NextAuth Callback JWT: profile object:",
        JSON.stringify(profile, null, 2)
      );

      if (account && profile) {
        token.userId = profile.sub || profile.oid || profile.id;
        token.roles =
          profile.roles ||
          profile._json.roles ||
          profile._json[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ] ||
          [];

        // Tente de récupérer le nom de plusieurs endroits possibles
        token.name =
          profile.name ||
          profile.displayName ||
          profile.given_name + " " + profile.family_name ||
          profile._json.name ||
          profile._json.displayName ||
          profile._json.given_name + " " + profile._json.family_name;
      }

      console.log(
        "NextAuth Callback JWT: token after modification:",
        JSON.stringify(token, null, 2)
      );
      return token;
    },
    async session({ session, token }) {
      session.user.roles = token.roles || [];
      session.user.id = token.userId || null;
      session.user.name = token.name || session.user.name; // Assurez-vous que le nom du token est transféré à la session

      console.log(
        "NextAuth Callback Session: session object:",
        JSON.stringify(session, null, 2)
      );
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
