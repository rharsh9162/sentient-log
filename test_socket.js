const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/stream", {
  query: { siteId: "test_socket_user" },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Connected to /stream!");

  const event = {
    event_type: "page_view",
    url: "http://localhost:3000/some-external-page",
    latency_ms: 0,
    metadata: { browser: "Chrome", device: "desktop" },
    session_id: "test_session",
    user_id: "test_socket_user",
    timestamp: new Date().toISOString(),
  };

  console.log("Emitting event...");
  socket.emit("event", event);
  
  setTimeout(() => {
    socket.disconnect();
    console.log("Disconnected.");
  }, 2000);
});

socket.on("connect_error", (err) => {
  console.error("Connect error:", err.message);
});
