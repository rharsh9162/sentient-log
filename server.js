/* This is the main runtime entry point of the app.
The reason this app needs a custom server is Socket.IO. Next.js handles pages and API routes, but this project also needs real-time WebSocket communication for live analytics.
  At a high level, server.js does 5 jobs:
    Starts a Next.js app.
    Creates a normal Node HTTP server.
    Connects to MongoDB.
    Attaches Socket.IO.
    Moves events from browser trackers to dashboards in real time.
*/

import { createServer } from "http"; // creates the underlying Node HTTP server.
import { parse } from "url"; // parses incoming request URLs.
import next from "next"; // starts the Next.js app.
import { Server } from "socket.io"; // creates the Socket.IO server.
import { connectDB } from "./src/lib/db.js"; // connects to MongoDB.
import { Event } from "./src/models/Event.js"; // defines and uses the Event model.

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0"; // means the server listens on all network interfaces, not just localhost.
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port }); // app is the Next.js application instance.
const handle = app.getRequestHandler(); // handle is Next’s request handler. Whenever a normal HTTP request comes in, this handler decides what to do.

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
  try {
    await connectDB();
  } catch (err) {
    console.error("[Server] MongoDB connection failed initially. The server will still start:", err.message);
  }

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  // ── Stream Namespace ──
  const trackerNs = io.of("/stream");

  trackerNs.on("connection", (socket) => {
    console.log(`[Stream] connected: ${socket.id}`);

    socket.on("event", async (data) => {
      try {
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
