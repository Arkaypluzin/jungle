// middleware.js
import { auth } from "./lib/auth"; // Import depuis votre fichier de configuration NextAuth.js
import { NextResponse } from "next/server";

// Routes qui nécessitent une authentification. Utilisez startsWith pour inclure les sous-routes.
const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/cra-manager",
  "/note-de-frais",
];

// Routes spécifiques aux administrateurs.
const adminRoutes = [
  "/dashboard/admin",
  "/admin/users",
  "/cra-manager/reports",
];

// Pages d'authentification (login, register)
const authPageRoutes = ["/login", "/register"];

export default auth(async (req) => {
  const { nextUrl } = req;
  const authData = req.auth;
  const isLoggedIn = !!authData;
  const userRole = authData?.user?.roles?.[0]?.toLowerCase() || "guest"; // Convertir en minuscules pour la comparaison

  const path = nextUrl.pathname;
  const isApiAuthRoute = path.startsWith("/api/auth");
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) => path.startsWith(route));
  const isAuthPageRoute = authPageRoutes.includes(path);

  // console.log(`--- Middleware Debug for Path: ${path} ---`);
  // console.log(`Is Logged In: ${isLoggedIn}`);
  // console.log(`User Role (normalized): ${userRole}`);
  // console.log(`Is API Auth Route: ${isApiAuthRoute}`);
  // console.log(`Is Protected Route: ${isProtectedRoute}`);
  // console.log(`Is Admin Route: ${isAdminRoute}`);
  // console.log(`Is Auth Page Route: ${isAuthPageRoute}`);
  // console.log(`Auth Data (partial): ${JSON.stringify(authData ? { id: authData.user?.id, name: authData.user?.name, roles: authData.user?.roles } : null)}`);

  if (isApiAuthRoute) {
    // console.log(`Action: Allowing API Auth route ${path}`);
    return NextResponse.next();
  }

  if (isProtectedRoute && !isLoggedIn) {
    const redirectUrl = new URL("/login", req.nextUrl.origin);
    redirectUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    // console.log(`Action: Redirecting unauthenticated user from ${path} to ${redirectUrl.pathname}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoggedIn && isAuthPageRoute) {
    // console.log(`Action: Redirecting logged-in user from auth page ${path} to /dashboard`);
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (isAdminRoute && isLoggedIn) {
    if (userRole !== "admin") {
      // console.log(`Action: Redirecting non-admin user from admin route ${path} to /dashboard`);
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    } else {
      // console.log(`Action: Allowing admin access to ${path}`);
    }
  }

  // console.log(`Action: Allowing access to ${path}`);
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)",
  ],
};
