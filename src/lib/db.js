// This file handles the MongoDB database connection for the Next.js API routes and backend services.
// Its main job:
//    Connect to MongoDB once, reuse that connection, and avoid creating a new   
//     database connection on every request.


import mongoose from "mongoose";
// Mongoose is a library that lets this app define models like: Event , Alert ,AlertHistory and then use MongoDB through JavaScript objects.

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sentient_log";

// It checks if there is already a cached Mongoose connection stored globally.
// If yes, use it.
// If no, create this object:
const cached = global.mongooseCache ?? { conn: null, promise: null };   
if (!global.mongooseCache) global.mongooseCache = cached;  // This stores the cache on Node’s global object.

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;  // If Mongoose is already connected, return immediately.

  if (cached.conn) {  // If the app already has a cached connection object, return it.
    return cached.conn;
  }

  if (!cached.promise) {   // If there is no connection currently being created, start creating one
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: "sentient_log" })
      .then((m) => {
        console.log("[DB] MongoDB connected successfully");
        return m;
      })
      .catch((err) => {
        console.error("[DB] MongoDB connection failed:", err.message);
        cached.promise = null;   // If connection failed, we do not want to keep a failed promise cached forever. Clearing it allows the next request to try connecting again
        throw err;
        // This passes the error upward.
        // So if an API route calls connectDB() and DB fails, the route can return an error response.
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





/*
This file behaves like:
    if already connected:
      reuse connection

    else if connection is currently happening:
      wait for it

    else:
      start a new MongoDB connection
      cache it
*/

