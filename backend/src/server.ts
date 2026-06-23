import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { autoPromoteAllDoctors } from "./routes/queue.routes";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://queuecare-neon.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  },
  transports: ["websocket"]
});

// Attach socket.io server instance to express app context
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);
  autoPromoteAllDoctors(io).catch(err => console.error("Error in connection auto-promotion:", err));

  // Authenticate socket token if provided (optional but good practice)
  const token = socket.handshake.auth?.token;
  if (token) {
    console.log(`Socket connected with token: ${token.substring(0, 15)}...`);
  }

  // Real-time re-broadcasting for general queue updates
  socket.on("queue:updated", (data) => {
    console.log("Socket: queue:updated event received, broadcasting to all clients");
    io.emit("queue:updated", data || {});
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket client disconnected (${socket.id}): ${reason}`);
  });
});

server.listen(PORT, async () => {
  console.log(`QueueCare Backend running on port ${PORT}`);
  console.log(`WebSocket Server listening for connections`);
  await autoPromoteAllDoctors(io);
});
