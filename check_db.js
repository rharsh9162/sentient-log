import { connectDB } from "./src/lib/db.js";
import { Event } from "./src/models/Event.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkEvents() {
  await connectDB();
  const recentEvents = await Event.find().sort({ timestamp: -1 }).limit(10);
  console.log("Recent Events:");
  recentEvents.forEach(e => {
    console.log(`- Type: ${e.event_type}, URL: ${e.url}, UserID: ${e.user_id}, Time: ${e.timestamp}`);
  });
  mongoose.disconnect();
}

checkEvents();
