import { NextResponse } from "next/server";  // NextResponse is used to return JSON responses from Next.js API routes
import { connectDB } from "@/lib/db";
import { getUserId } from "@/lib/getUser";

/**
 * Wraps a Next.js App Router API route to automatically handle:
 * 1. Database Connection
 * 2. User Authentication (optional)
 * 3. Standardized Error Handling
 */
export function withApiHandler(handler, options = { requireAuth: true }) {
// It takes two argumnets -> handler -> actual API logic & options -> Config for the  wrapper |  So by default, routes using this wrapper require login.
  return async (req, context) => {
    try {
      await connectDB();

      let userId = null;
      if (options.requireAuth) {
        userId = await getUserId();
        if (!userId) {  // If there is no logged-in user, stop immediately. 
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }
      }

      return await handler(req, { ...context, userId }); // It passes req(the request object) and modified context object 
    } catch (error) {     
      console.error("[API Error]", error);
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
