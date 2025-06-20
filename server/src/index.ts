import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = 3000;

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 32;
const OBJECT_SIZE = 32;
const PLAYER_SPEED = 300;
const GRAVITY = 1500;
const SPAWN_RATE = 0.3; 
const TICK_RATE = 20;
const DT = 1 / TICK_RATE;

interface Player {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  score: number;
  skin: string;
  shieldUntil: number;
  freezeUntil: number;
  slowUntil: number;
}

interface GameObject {
  id: string;
  x: number;
  y: number;
  vy: number;
  type: 'block' | 'shield' | 'freeze' | 'slow';
  width: number;
  height: number;
}

const players: Map<string, Player> = new Map();
const gameObjects: Map<string, GameObject> = new Map();
const skins = ['knight', 'wizard', 'archer', 'rogue'];

let lastSpawn = 0;
let gameTime = 0;

const gameLoop = setInterval(() => {
  gameTime += DT;
  updateGame();
  io.emit('gameState', {
    players: Array.from(players.values()),
    objects: Array.from(gameObjects.values()),
    gameTime: gameTime
  });
}, 1000 / TICK_RATE);

function updateGame() {
  if (gameTime - lastSpawn > SPAWN_RATE) {
    spawnObject();
    lastSpawn = gameTime;
  }
  for (const [id, obj] of gameObjects) {
    obj.vy += GRAVITY * DT;
    obj.y += obj.vy * DT;
    if (obj.y > GAME_HEIGHT + 100) {
      gameObjects.delete(id);
      continue;
    }
    for (const [playerId, player] of players) {
      if (!player.alive) continue;
      
      if (checkCollision(player, obj)) {
        handleCollision(player, obj);
        if (obj.type === 'block') {
          gameObjects.delete(id);
        }
      }
    }
  }
  for (const [id, player] of players) {
    if (!player.alive) continue;
    if (gameTime * 1000 < player.freezeUntil) {
      player.vx = 0;
      player.vy = 0;
      continue;
    }
    let speedMultiplier = 1;
    if (gameTime * 1000 < player.slowUntil) {
      speedMultiplier = 0.3;
    }
    player.x += player.vx * DT * speedMultiplier;
    player.y += player.vy * DT * speedMultiplier;
    player.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, player.y));
    player.score += DT * 10;
  }
}

function spawnObject() {
  const types = ['block', 'shield', 'freeze', 'slow'];
  const weights = [0.7, 0.1, 0.1, 0.1]; 
  
  let random = Math.random();
  let type = 'block';
  
  for (let i = 0; i < types.length; i++) {
    if (random < weights[i]) {
      type = types[i];
      break;
    }
    random -= weights[i];
  }

  const obj: GameObject = {
    id: uuid(),
    x: Math.random() * (GAME_WIDTH - OBJECT_SIZE),
    y: -OBJECT_SIZE,
    vy: 0,
    type: type as any,
    width: OBJECT_SIZE,
    height: OBJECT_SIZE
  };

  gameObjects.set(obj.id, obj);
}

function checkCollision(player: Player, obj: GameObject): boolean {
  return (
    player.x < obj.x + obj.width &&
    player.x + PLAYER_SIZE > obj.x &&
    player.y < obj.y + obj.height &&
    player.y + PLAYER_SIZE > obj.y
  );
}

function handleCollision(player: Player, obj: GameObject) {
  const now = gameTime * 1000;

  switch (obj.type) {
    case 'block':
      if (now > player.shieldUntil) {
        player.alive = false;
      }
      break;
    
    case 'shield':
      player.shieldUntil = now + 5000;
      gameObjects.delete(obj.id);
      break;
    
    case 'freeze':
      for (const [id, p] of players) {
        if (id !== player.id) {
          p.freezeUntil = now + 3000;
        }
      }
      gameObjects.delete(obj.id);
      break;
    
    case 'slow':
      for (const [id, p] of players) {
        if (id !== player.id) {
          p.slowUntil = now + 4000;
        }
      }
      gameObjects.delete(obj.id);
      break;
  }
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  const player: Player = {
    id: socket.id,
    x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
    y: GAME_HEIGHT - PLAYER_SIZE - 10,
    vx: 0,
    vy: 0,
    alive: true,
    score: 0,
    skin: skins[Math.floor(Math.random() * skins.length)],
    shieldUntil: 0,
    freezeUntil: 0,
    slowUntil: 0
  };

  players.set(socket.id, player);
  socket.emit('gameInit', {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    playerId: socket.id
  });
  socket.on('input', (input: { left: boolean; right: boolean; up: boolean; down: boolean }) => {
    const player = players.get(socket.id);
    if (!player || !player.alive) return;

    let vx = 0;
    let vy = 0;

    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    player.vx = vx * PLAYER_SPEED;
    player.vy = vy * PLAYER_SPEED;
  });

  socket.on('respawn', () => {
    const player = players.get(socket.id);
    if (!player) return;

    player.alive = true;
    player.x = GAME_WIDTH / 2 - PLAYER_SIZE / 2;
    player.y = GAME_HEIGHT - PLAYER_SIZE - 10;
    player.vx = 0;
    player.vy = 0;
    player.score = 0;
    player.shieldUntil = 0;
    player.freezeUntil = 0;
    player.slowUntil = 0;
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    players.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});