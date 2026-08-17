import { auth } from "@clerk/nextjs/server";  // This imports Clerk’s server-side auth helper.

/**
 * Extract the authenticated user's ID via Clerk.
 * Returns the Clerk userId string, or null if unauthenticated.
 */
export async function getUserId() {
  try {
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}
