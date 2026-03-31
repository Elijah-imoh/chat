import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory state
  const rooms = new Map<string, {
    users: Map<string, { id: string, name: string, isTyping: boolean }>;
    messages: any[];
  }>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomKey, userName }) => {
      socket.join(roomKey);
      
      if (!rooms.has(roomKey)) {
        rooms.set(roomKey, { users: new Map(), messages: [] });
      }
      
      const room = rooms.get(roomKey)!;
      room.users.set(socket.id, { id: socket.id, name: userName, isTyping: false });

      // Notify others
      socket.to(roomKey).emit("user-joined", { 
        id: socket.id, 
        name: userName,
        timestamp: new Date().toISOString()
      });

      // Send current state to the new user
      socket.emit("room-state", {
        users: Array.from(room.users.values()),
        messages: room.messages
      });

      console.log(`${userName} joined room ${roomKey}`);
    });

    socket.on("send-message", ({ roomKey, text, userName }) => {
      const message = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        userName,
        userId: socket.id,
        timestamp: new Date().toISOString(),
        type: 'chat'
      };

      const room = rooms.get(roomKey);
      if (room) {
        room.messages.push(message);
        // Keep last 100 messages
        if (room.messages.length > 100) room.messages.shift();
        io.to(roomKey).emit("new-message", message);
      }
    });

    socket.on("typing", ({ roomKey, isTyping }) => {
      const room = rooms.get(roomKey);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) {
          user.isTyping = isTyping;
          socket.to(roomKey).emit("user-typing", {
            userId: socket.id,
            userName: user.name,
            isTyping
          });
        }
      }
    });

    socket.on("disconnecting", () => {
      for (const roomKey of socket.rooms) {
        if (roomKey !== socket.id) {
          const room = rooms.get(roomKey);
          if (room) {
            const user = room.users.get(socket.id);
            if (user) {
              socket.to(roomKey).emit("user-left", {
                id: socket.id,
                name: user.name,
                timestamp: new Date().toISOString()
              });
              room.users.delete(socket.id);
              
              // Clean up empty rooms
              if (room.users.size === 0) {
                // Optional: delay cleanup or keep for a while
                // rooms.delete(roomKey);
              }
            }
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
