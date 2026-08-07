import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sentient_log";

const cached = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) global.mongooseCache = cached;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;

  if (cached.conn) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: "sentient_log" })
      .then((m) => {
        console.log("[DB] MongoDB connected successfully");
        return m;
      })
      .catch((err) => {
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
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
}

