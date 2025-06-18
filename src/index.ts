import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
const PORT = 3000;

interface Player {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const players: Record<string, Player> = {};

io.on("connection", (socket) => {
  console.log("new player just got in", socket.id);
  players[socket.id] = {
    id: socket.id,
    x: Math.random() * 800,
    y: 550,
    vx: 0,
    vy: 0,
  };

  socket.on("input", (data: { dx: number; dy: number }) => {
    const player = players[socket.id];
    if (player) {
      const speed = 300;
      player.vx = data.dx * speed;
      player.vy = data.dy * speed;
    }
  });
  socket.on("disconnect", () => {
    delete players[socket.id];
    console.log("Player disconnected:", socket.id);
  });
});

const TICK_RATE = 20;
const DT = 1 / TICK_RATE;

setInterval(() => {
  // Update player positions
  for (const player of Object.values(players)) {
    player.x += player.vx * DT;
    player.y += player.vy * DT;

    // Keep inside arena bounds
    player.x = Math.max(0, Math.min(800, player.x));
    player.y = Math.max(0, Math.min(600, player.y));
  }

  // Broadcast state
  io.emit("state", { players: Object.values(players) });
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`Game server listening on http://localhost:${PORT}`);
});