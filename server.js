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
// t resets when the server restarts.
// It is used for “live visitor” counts in the dashboard

function getVisitorStats(userId) {
  const now = Date.now();
  // Expire visitors not seen in 5 minutes
  for (const [id, v] of activeVisitors) {
    if (now - v.lastSeen > 5 * 60 * 1000) activeVisitors.delete(id);
    // a visitor has not been seen in 5 minutes, remove them
  }

  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  const pages = {};
  let total = 0;

  for (const [, v] of activeVisitors) {
    if (v.userId !== userId) continue;   // Only count visitors for this dashboard user.
    total++;
    devices[v.device] = (devices[v.device] || 0) + 1;
    if (v.page) pages[v.page] = (pages[v.page] || 0) + 1;
  }

  return {
    total,
    devices,
    topPages: Object.entries(pages)  // It returns the top 10 active pages
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count })),
  };
}

// ── Debounced stats broadcaster ──
const dirtyUsers = new Set();  // stores users whose visitor stats need broadcasting.
let statsBroadcastTimer = null;  // ensures broadcasts are batched.

function scheduleStatsBroadcast(dashboardNamespace, userId) {
  if (userId) dirtyUsers.add(userId);
  if (statsBroadcastTimer) return; // If a timer is already scheduled, do nothing else.
  
  statsBroadcastTimer = setTimeout(() => {
    statsBroadcastTimer = null;
    for (const uid of dirtyUsers) {
      dashboardNamespace.to(uid).emit("visitors:update", getVisitorStats(uid));
    }
    dirtyUsers.clear();
  }, 2000);
  // After 2 seconds, send updated visitor stats to each affected user.
  // This prevents the server from broadcasting too often when many events arrive quickly.
}

// ── Boot ──
app.prepare().then(async () => { // app.prepare() initializes Next.js. After that, MongoDB connection is attempted.
  try {
    await connectDB();
  } catch (err) {
    console.error("[Server] MongoDB connection failed initially. The server will still start:", err.message);
  }

  const server = createServer((req, res) => { // This creates the HTTP server . Every normal HTTP request is passed to Next.js.
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);  // All go through handle.
  });

// Attach Socket.IO
// This attaches Socket.IO to the same HTTP server.
// CORS allows any origin. That makes sense because external websites may use the tracker script.
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",  // Socket.IO endpoint path
    // The browser client will load/connect through paths like:  /socket.io/...
  });

  // ── Stream Namespace ──
  const trackerNs = io.of("/stream");
  // A namespace is like a separate real-time channel
  //  /stream     = incoming events from websites 
//    /dashboard  = outgoing events to dashboard users

  trackerNs.on("connection", (socket) => {
  // socket represents one connected browser/client.
// If 10 websites connect, there are 10 socket objects.
// socket.id is a unique ID Socket.IO gives to that connection.
    console.log(`[Stream] connected: ${socket.id}`);

    socket.on("event", async (data) => {  // When this connected tracker sends an event named "event", receive its data and run this function.
      try {
        const events = Array.isArray(data) ? data : [data]; // id data is an array , keep it , else wrap it in an array 

        const taggedEvents = events.map((e) => ({
          ...e,
          timestamp: e.timestamp || new Date(),
          user_id: e.user_id || socket.handshake.query.siteId || undefined,
          // The server needs to know which SentientLog account owns this event.
          // In public/script.js, connection looks like:
                    // socket = io(`${scriptOrigin}/stream`, {
                    //   query: { siteId: siteId || "" },
                    // });     
          // On the server, that is available as:   socket.handshake.query.siteId     
            
        }));

        // Save to DB
        console.log(`[Stream] inserting ${taggedEvents.length} events for user ${taggedEvents[0]?.user_id}`);
        await Event.insertMany(taggedEvents, { ordered: false });  // ordered: false ---> if one event has a problem  , MONGODB can still insert others 
        console.log(`[Stream] successfully inserted ${taggedEvents.length} events`);

        // Update active visitor tracking
        for (const evt of taggedEvents) {
          if (!evt.user_id) continue;
          activeVisitors.set(socket.id, {   // A Map stores key-value pairs (key -> socket_id , value -> ....)
          userId: evt.user_id,
            sessionId: evt.session_id,
            lastSeen: Date.now(),  // If the same browser sends more events, its visitor info gets updated. lastSeen is used to know if the visitor is still active.
            device: evt.metadata?.device || "desktop",
            page: evt.url ? new URL(evt.url, "http://localhost").pathname : "/",
          });
        }

        // Broadcast each event to dashboard clients in the correct room
        const dashNs = io.of("/dashboard");  // dashNs is the dashboard namespace
        const usersToUpdate = new Set();
        for (const evt of taggedEvents) {
          if (evt.user_id) {
            dashNs.to(evt.user_id).emit("event:new", evt);  // Send event named "event:new" to every dashboard socket in room user_id .
            usersToUpdate.add(evt.user_id);
          }
        }

        // Schedule debounced stats broadcast for affected users
        // f 20 events arrive for the same user, we do not want to update visitor stats 20 times.
        // So this code collects affected user ID
        for (const uid of usersToUpdate) {
          scheduleStatsBroadcast(dashNs, uid);
        }
      } catch (err) {
        console.error("[Stream] event handling error:", err.message);
      }
    });
    // If a visitor closes the website tab, loses internet, or leaves, Socket.IO eventually triggers "disconnect".Then the server removes the visitor and tells dashboard to update visitor stats.
    socket.on("disconnect", () => {
      const v = activeVisitors.get(socket.id);
      if (v?.userId) {
        activeVisitors.delete(socket.id);
        scheduleStatsBroadcast(io.of("/dashboard"), v.userId);
      }
    });
  });
  
  // Now the second namespace:
  const dashboardNs = io.of("/dashboard");

  dashboardNs.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;   // When dashboard connects, it sends userId.
    console.log(`[Dashboard] connected: ${socket.id} (user: ${userId || "unknown"})`);

    if (userId) {
      socket.join(userId);  // The dashboard enters a room named after the user ID.
      // Sends current visitor stats immediately to this dashboard socket.
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



/* 
So event flow is: SOCKET.IO
      External website tracker
        emits "event"
              |
              v
      Socket.IO /stream namespace
        receives event
        saves MongoDB
        checks user_id
              |
              v
      Socket.IO /dashboard namespace
        emits "event:new" to room user_id
              |
              v
      Dashboard browser receives live update
*/
