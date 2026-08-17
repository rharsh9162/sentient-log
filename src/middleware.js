// This file controls route protection using Clerk.
// Decide which routes are public and which routes require login.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// clerkMiddleware -> creates middleware that can check authentication.
// createRouteMatcher -> creates a function that can test whether a request matches certain route patterns.
const isPublicRoute = createRouteMatcher([ // this defines public routes 
  "/",    // landing page
  "/login(.*)",   // login page
  "/register(.*)",  // signup page 
  "/api/v1/ingest",  // Public tracker ingestion endpoint. External websites must be able to send analytics events even when nobody is logged in.
  "/api/v1/health",  // Public health check endpoint.
  "/api/inngest",   // Inngest webhook/function endpoint. Inngest needs to reach this route externally
  "/socket.io(.*)",  // Socket.IO transport routes. These must remain reachable for real-time connections.
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) { // If the user is not logged in, block them or redirect them through Clerk auth behavior.
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
// This tells Next.js which requests should run through middleware.
// It excludes things like:
      // _next/static
      // _next/image
      // favicon.ico
      // files with extensions

