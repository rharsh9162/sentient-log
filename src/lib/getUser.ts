import { auth } from '@clerk/nextjs/server';

/**
 * Extract the authenticated user's ID via Clerk.
 * Returns the Clerk userId string, or null if unauthenticated.
 */
export async function getUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}
