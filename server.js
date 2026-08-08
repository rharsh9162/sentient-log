const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ── MongoDB connection (reuses the same approach as lib/db.js) ──
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sentient_log";

let dbReady = false;

async function connectMongo() {
  if (dbReady && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGODB_URI, { dbName: "sentient_log" });
    dbReady = true;
    console.log("[Server] MongoDB connected");
  } catch (err) {
    console.error("[Server] MongoDB connection failed:", err.message);
    dbReady = false;
  }
}

// ── Event model (inline to avoid ESM import issues in CJS server) ──
let EventModel;

function getEventModel() {
  if (EventModel) return EventModel;

  // Reuse existing model if already registered (hot reload safety)
  if (mongoose.models.Event) {
    EventModel = mongoose.models.Event;
    return EventModel;
  }

  const EventSchema = new mongoose.Schema(
    {
      event_type: {
        type: String,
        required: true,
        enum: [
          "page_view",
          "click",
          "error",
          "api_call",
        ],
      },
      url: { type: String, required: true },
      latency_ms: { type: Number, required: true },
      status_code: { type: Number },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      session_id: { type: String },
      user_id: { type: String, index: true },
      timestamp: { type: Date, default: Date.now },
    },
    { timestamps: false }
  );

  EventSchema.index({ timestamp: -1 });
  EventSchema.index({ url: 1 });
  EventSchema.index({ event_type: 1 });

  EventModel = mongoose.model("Event", EventSchema);
  return EventModel;
}

// ── Active visitors tracking ──
const activeVisitors = new Map(); // socketId -> { userId, sessionId, lastSeen, device, page }

function getVisitorStats(userId) {
  const now = Date.now();
  // Expire visitors not seen in 5 minutes
  for (const [id, v] of activeVisitors) {
    if (now - v.lastSeen > 5 * 60 * 1000) activeVisitors.delete(id);
  }

  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  const pages = {};
  let total = 0;

  for (const [, v] of activeVisitors) {
    if (v.userId !== userId) continue;
    total++;
    devices[v.device] = (devices[v.device] || 0) + 1;
    if (v.page) pages[v.page] = (pages[v.page] || 0) + 1;
  }

  return {
    total,
    devices,
    topPages: Object.entries(pages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count })),
  };
}

// ── Debounced stats broadcaster ──
const dirtyUsers = new Set();
let statsBroadcastTimer = null;

function scheduleStatsBroadcast(dashboardNamespace, userId) {
  if (userId) dirtyUsers.add(userId);
  if (statsBroadcastTimer) return;
  
  statsBroadcastTimer = setTimeout(() => {
    statsBroadcastTimer = null;
    for (const uid of dirtyUsers) {
      dashboardNamespace.to(uid).emit("visitors:update", getVisitorStats(uid));
    }
    dirtyUsers.clear();
  }, 2000);
}

// ── Boot ──
app.prepare().then(async () => {
  await connectMongo();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    // Natively intercept HTTP fallback ingest
    if (parsedUrl.pathname === "/api/v1/ingest") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const events = data.events;
            if (!Array.isArray(events) || events.length === 0) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: "events array required" }));
              return;
            }

            const targetUserId = data.siteId || parsedUrl.query.siteId;
            const Event = getEventModel();
            
            const taggedEvents = events.map((e) => ({
              ...e,
              timestamp: e.timestamp || new Date(),
              user_id: e.user_id || targetUserId || undefined,
            }));

            await Event.insertMany(taggedEvents, { ordered: false });

            // Broadcast to dashboard namespace natively
            const dashNs = io.of("/dashboard");
            const usersToUpdate = new Set();
            for (const evt of taggedEvents) {
              if (evt.user_id) {
                dashNs.to(evt.user_id).emit("event:new", evt);
                usersToUpdate.add(evt.user_id);
              }
            }

            for (const uid of usersToUpdate) {
              scheduleStatsBroadcast(dashNs, uid);
            }

            res.writeHead(202, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ accepted: taggedEvents.length }));
          } catch (err) {
            console.error("[Ingest] error:", err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Internal Server Error" }));
          }
        });
        return;
      }
    }

    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  // Expose io globally so Next.js API routes (HTTP fallback) can broadcast events
  global.io = io;

  // ── Stream Namespace ──
  const trackerNs = io.of("/stream");

  trackerNs.on("connection", (socket) => {
    console.log(`[Stream] connected: ${socket.id}`);

    socket.on("event", async (data) => {
      try {
        const Event = getEventModel();
        const events = Array.isArray(data) ? data : [data];

        const taggedEvents = events.map((e) => ({
          ...e,
          timestamp: e.timestamp || new Date(),
          user_id: e.user_id || socket.handshake.query.siteId || undefined,
        }));

        // Save to DB
        console.log(`[Stream] inserting ${taggedEvents.length} events for user ${taggedEvents[0]?.user_id}`);
        await Event.insertMany(taggedEvents, { ordered: false });
        console.log(`[Stream] successfully inserted ${taggedEvents.length} events`);

        // Update active visitor tracking
        for (const evt of taggedEvents) {
          if (!evt.user_id) continue;
          activeVisitors.set(socket.id, {
            userId: evt.user_id,
            sessionId: evt.session_id,
            lastSeen: Date.now(),
            device: evt.metadata?.device || "desktop",
            page: evt.url ? new URL(evt.url, "http://localhost").pathname : "/",
          });
        }

        // Broadcast each event to dashboard clients in the correct room
        const dashNs = io.of("/dashboard");
        const usersToUpdate = new Set();
        for (const evt of taggedEvents) {
          if (evt.user_id) {
            dashNs.to(evt.user_id).emit("event:new", evt);
            usersToUpdate.add(evt.user_id);
          }
        }

        // Schedule debounced stats broadcast for affected users
        for (const uid of usersToUpdate) {
          scheduleStatsBroadcast(dashNs, uid);
        }
      } catch (err) {
        console.error("[Stream] event handling error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      const v = activeVisitors.get(socket.id);
      if (v?.userId) {
        activeVisitors.delete(socket.id);
        scheduleStatsBroadcast(io.of("/dashboard"), v.userId);
      }
    });
  });

  const dashboardNs = io.of("/dashboard");

  dashboardNs.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`[Dashboard] connected: ${socket.id} (user: ${userId || "unknown"})`);

    if (userId) {
      socket.join(userId);
      // Send current visitor stats immediately on connect
      socket.emit("visitors:update", getVisitorStats(userId));
    }

    socket.on("disconnect", () => {
      console.log(`[Dashboard] disconnected: ${socket.id}`);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`\n  > SentientLog ready on http://${hostname}:${port}\n`);
  });
});
