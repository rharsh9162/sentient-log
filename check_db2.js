import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI");
  
  await mongoose.connect(uri);
  
  const EventSchema = new mongoose.Schema({}, { strict: false });
  const Event = mongoose.model('Event', EventSchema);
  
  // Find all events created in the last 15 minutes
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
  const recent = await Event.find({ timestamp: { $gte: fifteenMinsAgo } }).sort({ timestamp: -1 });
  
  console.log(`Found ${recent.length} events in the last 15 minutes.`);
  
  const byUser = {};
  recent.forEach(e => {
    const uid = e.user_id || 'UNDEFINED_USER_ID';
    byUser[uid] = (byUser[uid] || 0) + 1;
  });
  
  console.log("Events by user_id:", byUser);
  
  if (recent.length > 0) {
    console.log("Latest event:");
    console.log(JSON.stringify(recent[0], null, 2));
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
