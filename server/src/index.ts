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
  skin: string;
  shieldUntil: number;
  freezeUntil: number;
  slowUntil: number;
}
type ObjectKind = "block" | "shield" | "freeze" | "slow";
interface FallingObject {
  id: string;
  x: number;
  y: number;
  vy: number;
  type: ObjectKind;
}

const players: Record<string, Player> = {};
const objects: Record<string, FallingObject> = {};
const powerupTypes: ObjectKind[] = ["shield", "freeze", "slow"];

const poweUpTime = 0.1;
const ARENA_WIDTH = 1024;
const ARENA_HEIGHT = 600;
const TICK_RATE = 20;
const DT = 1 / TICK_RATE;
const SPAWN_INTERVAL = 500;
const GRAVITY = 800;
const skinList = ["knight", "bird"];
let lastSpawn = Date.now();

io.on("connection", (socket) => {
  console.log("New player:", socket.id);
  const randomSkin = skinList[Math.floor(Math.random() * skinList.length)];
  players[socket.id] = {
    id: socket.id,
    x: Math.random() * ARENA_WIDTH,
    y: ARENA_HEIGHT - 50,
    vx: 0,
    vy: 0,
    skin: randomSkin,
    shieldUntil: 0,
    freezeUntil: 0,
    slowUntil: 0,
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
    const pu = Math.random() < poweUpTime;
    const obj: FallingObject = {
      id: uuid(),
      x: Math.random() * ARENA_WIDTH,
      y: 0,
      vy: 0,
      type: pu ? powerupTypes[Math.floor(Math.random()*powerupTypes.length)] : "block",
    };
    objects[obj.id] = obj;
    lastSpawn = now;
  }

  for (const obj of Object.values(objects)) {
    obj.vy += GRAVITY * DT;
    obj.y += obj.vy * DT;
  }

  for (const p of Object.values(players)) {
    const now = Date.now();
    if (now < p.freezeUntil) {
      p.vx = 0;
      p.vy = 0;
      continue;
    }
    const speedMultiplier = now < p.slowUntil ? 0.5 : 1;
    p.x += p.vx * DT * speedMultiplier;
    p.y += p.vy * DT * speedMultiplier;
    p.x = Math.max(0, Math.min(ARENA_WIDTH, p.x));
    p.y = Math.max(0, Math.min(ARENA_HEIGHT, p.y));
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
        p.y + size > obj.y &&
        obj.type === "block"
      ) {
        if (Date.now() > p.shieldUntil) {
          toRemovePlayers.add(p.id);
        }
        toRemoveObjs.add(obj.id);
      } else if (
        p.x < obj.x + size &&
        p.x + size > obj.x &&
        p.y < obj.y + size &&
        p.y + size > obj.y &&
        obj.type === "shield"
      ) {
        p.shieldUntil = Date.now() + 5000;
        break;
      } else if (
        p.x < obj.x + size &&
        p.x + size > obj.x &&
        p.y < obj.y + size &&
        p.y + size > obj.y &&
        obj.type === "freeze"
      ) {
        for (const others of Object.values(players)) {
          if (others.id != p.id) {
            others.freezeUntil = Date.now() + 5000;
          }
        }
        toRemoveObjs.add(obj.id);
        break;
      }
       else if (
        p.x < obj.x + size &&
        p.x + size > obj.x &&
        p.y < obj.y + size &&
        p.y + size > obj.y &&
        obj.type === "slow"
      ) {
        for (const others of Object.values(players)) {
          if (others.id != p.id) {
            others.slowUntil = Date.now() + 5000;
          }
        }
        toRemoveObjs.add(obj.id);
        break;
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
