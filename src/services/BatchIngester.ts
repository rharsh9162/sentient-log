import { ILogEvent } from '@/models/Event';
import { connectDB } from '@/lib/db';

// We need dynamic import for the Event model to avoid issues with mongoose in edge runtime
let EventModel: typeof import('@/models/Event').Event | null = null;

async function getEventModel() {
  if (!EventModel) {
    await connectDB();
    const mod = await import('@/models/Event');
    EventModel = mod.Event;
  }
  return EventModel;
}

class BatchIngesterService {
  private buffer: ILogEvent[] = [];
  private readonly FLUSH_INTERVAL_MS = 5000;
  private readonly FLUSH_BATCH_SIZE = 100;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startFlushing();
  }

  private startFlushing() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
    console.log('✅ BatchIngester started');
  }

  add(events: ILogEvent[]): void {
    const stamped = events.map((e) => ({
      ...e,
      timestamp: e.timestamp ?? new Date(),
    }));
    this.buffer.push(...stamped);

    if (this.buffer.length >= this.FLUSH_BATCH_SIZE) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    try {
      const Event = await getEventModel();
      await Event.insertMany(batch, { ordered: false });
      console.log(`💾 Flushed ${batch.length} events`);
    } catch (err) {
      console.error('BatchIngester flush error:', err);
      this.buffer.unshift(...batch);
    }
  }

  get bufferSize(): number {
    return this.buffer.length;
  }
}

// Singleton pattern for Next.js (survives hot reload in dev)
declare global {
   
  var batchIngester: BatchIngesterService | undefined;
}

export const batchIngester =
  global.batchIngester ?? new BatchIngesterService();

if (process.env.NODE_ENV !== 'production') {
  global.batchIngester = batchIngester;
}
