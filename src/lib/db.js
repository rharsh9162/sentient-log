import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sentient_log";

const cached = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB() {
  if (cached.conn) {
    // Verify connection is still alive
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    // Connection dropped — reset cache
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    console.log("[DB] Connecting to MongoDB...");
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: "sentient_log", // explicitly specify DB name
      })
      .then((m) => {
        console.log("[DB] MongoDB connected successfully");
        return m;
      })
      .catch((err) => {
        // CRITICAL: Reset the cached promise on failure
        // so the next request can retry instead of reusing the rejected promise
        console.error("[DB] MongoDB connection failed:", err.message);
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    // Reset on await failure too
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
}
