import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = 3000;

interface Player {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  skin:string;
}

interface FallingObject {
  id: string;
  x: number;
  y: number;
  vy: number;
}

const players: Record<string, Player> = {};
const objects: Record<string, FallingObject> = {};


const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const TICK_RATE = 20;           
const DT = 1 / TICK_RATE;      
const SPAWN_INTERVAL = 500;    
const GRAVITY = 800;           
let lastSpawn = Date.now();


io.on("connection", (socket) => {
  console.log("New player:", socket.id);
  players[socket.id] = {
    id: socket.id,
    x: Math.random() * ARENA_WIDTH,
    y: ARENA_HEIGHT - 50,
    vx: 0,
    vy: 0,
    skin:"knight"
  };

  socket.on("input", (data: { dx: number; dy: number }) => {
    const p = players[socket.id];
    if (p) {
      const speed = 300;
      p.vx = data.dx * speed;
      p.vy = data.dy * speed;
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    console.log("Player left:", socket.id);
  });
});


setInterval(() => {
  const now = Date.now();

  if (now - lastSpawn >= SPAWN_INTERVAL) {
    const obj: FallingObject = {
      id: uuid(),
      x: Math.random() * ARENA_WIDTH,
      y: 0,
      vy: 0,
    };
    objects[obj.id] = obj;
    lastSpawn = now;
  }

  for (const obj of Object.values(objects)) {
    obj.vy += GRAVITY * DT;
    obj.y += obj.vy * DT;
  }

  for (const p of Object.values(players)) {
    p.x = Math.max(0, Math.min(ARENA_WIDTH, p.x + p.vx * DT));
    p.y = Math.max(0, Math.min(ARENA_HEIGHT, p.y + p.vy * DT));
  }

  const toRemoveObjs = new Set<string>();
  const toRemovePlayers = new Set<string>();
  const size = 32;

  for (const obj of Object.values(objects)) {
    if (obj.y > ARENA_HEIGHT) {
      toRemoveObjs.add(obj.id);
      continue;
    }
    for (const p of Object.values(players)) {
      if (
        p.x < obj.x + size &&
        p.x + size > obj.x &&
        p.y < obj.y + size &&
        p.y + size > obj.y
      ) {
        toRemovePlayers.add(p.id);
        toRemoveObjs.add(obj.id);
      }
    }
  }

  for (const id of toRemoveObjs) delete objects[id];
  for (const id of toRemovePlayers) delete players[id];

  io.emit("state", {
    players: Object.values(players),
    objects: Object.values(objects),
  });
}, 1000 / TICK_RATE);

server.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
