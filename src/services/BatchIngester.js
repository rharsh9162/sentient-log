import { connectDB } from "@/lib/db";

// We need dynamic import for the Event model to avoid issues with mongoose in edge runtime
let EventModel = null;

async function getEventModel() {
  if (!EventModel) {
    await connectDB();
    const mod = await import("@/models/Event");
    EventModel = mod.Event;
  }
  return EventModel;
}

class BatchIngesterService {
  buffer = [];
  FLUSH_INTERVAL_MS = 5000;
  FLUSH_BATCH_SIZE = 100;
  intervalId = null;

  constructor() {
    this.startFlushing();
  }

  startFlushing() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
    console.log("[BatchIngester] started");
  }

  add(events) {
    const stamped = events.map((e) => ({
      ...e,
      timestamp: e.timestamp ?? new Date(),
    }));
    this.buffer.push(...stamped);

    if (this.buffer.length >= this.FLUSH_BATCH_SIZE) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    try {
      const Event = await getEventModel();
      await Event.insertMany(batch, { ordered: false });
      console.log(`[BatchIngester] Flushed ${batch.length} events`);
    } catch (err) {
      console.error("BatchIngester flush error:", err);
      this.buffer.unshift(...batch);
    }
  }

  get bufferSize() {
    return this.buffer.length;
  }
}

// Singleton pattern for Next.js (survives hot reload in dev)

export const batchIngester = global.batchIngester ?? new BatchIngesterService();

if (process.env.NODE_ENV !== "production") {
  global.batchIngester = batchIngester;
}
