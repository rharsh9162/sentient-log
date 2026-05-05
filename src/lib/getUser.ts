import { getServerSession } from 'next-auth';
import { decode } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

/**
 * Extract the authenticated user's ID.
 * Tries multiple methods to ensure reliability in Next.js App Router.
 */
export async function getUserId(): Promise<string | null> {
  // Method 1: getServerSession
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string } | undefined;
    if (user?.id) return user.id;
    
    // If session exists but no id, look up by email
    if (user?.email) {
      await connectDB();
      const dbUser = await User.findOne({ email: user.email }).lean();
      if (dbUser) return (dbUser as { _id: { toString(): string } })._id.toString();
    }
  } catch {
    // Fall through
  }

  // Method 2: Decode JWT cookie directly
  try {
    const cookieStore = await cookies();
    const tokenValue =
      cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('__Secure-next-auth.session-token')?.value;

    if (tokenValue && process.env.NEXTAUTH_SECRET) {
      const decoded = await decode({
        token: tokenValue,
        secret: process.env.NEXTAUTH_SECRET,
      });
      
      if (decoded) {
        // Token might have id or sub
        const id = (decoded as Record<string, unknown>).id as string | undefined;
        if (id) return id;
        
        // Look up by email from token
        const email = (decoded as Record<string, unknown>).email as string | undefined;
        if (email) {
          await connectDB();
          const dbUser = await User.findOne({ email }).lean();
          if (dbUser) return (dbUser as { _id: { toString(): string } })._id.toString();
        }
      }
    }
  } catch {
    // Fall through
  }

  return null;
}
