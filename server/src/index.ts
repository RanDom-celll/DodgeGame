import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { Player,GameObject,Rooms } from "./types/all";
import { PORT,GAME_HEIGHT,GAME_WIDTH,PLAYER_SIZE,OBJECT_SIZE,PLAYER_SPEED,GRAVITY,SPAWN_RATE,TICK_RATE,DT,ROOM_CLEANUP_DELAY,skins } from "./utils/constants";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const room: Map<string, Rooms> = new Map();
const socketToRoom: Map<string, string> = new Map();

function createRoomState(): Rooms {
  const now = Date.now();
  return {
    players: new Map(),
    objects: new Map(),
    lastSpawn: 0,
    gameTime: 0,
    createdAt: now,
    lastActivity: now,
  };
}

function scheduleRoomCleanup(code: string) {
  const roomState = room.get(code);
  if (!roomState) return;

  if (roomState.cleanupTimeout) {
    clearTimeout(roomState.cleanupTimeout);
  }

  roomState.cleanupTimeout = setTimeout(() => {
    const currentRoom = room.get(code);
    if (currentRoom && currentRoom.players.size === 0) {
      console.log(`Cleaning up empty room ${code} after timeout`);
      room.delete(code);
    }
  }, ROOM_CLEANUP_DELAY);
}

function updateRoomActivity(code: string) {
  const roomState = room.get(code);
  if (roomState) {
    roomState.lastActivity = Date.now();
    
    if (roomState.players.size > 0 && roomState.cleanupTimeout) {
      clearTimeout(roomState.cleanupTimeout);
      roomState.cleanupTimeout = undefined;
    }
  }
}

const gameLoop = setInterval(() => {
  for (const [code, state] of room.entries()) {
    if (state.players.size > 0) {
      state.gameTime += DT;
      updateGame(state);
      updateRoomActivity(code);
      
      io.to(code).emit("gameState", {
        players: Array.from(state.players.values()),
        objects: Array.from(state.objects.values()),
        gameTime: state.gameTime,
      });
    }
  }
}, 1000 / TICK_RATE);

function updateGame(state: Rooms) {
  if (state.gameTime - state.lastSpawn > SPAWN_RATE) {
    spawnObject(state);
    state.lastSpawn = state.gameTime;
  }

  for (const [id, obj] of state.objects) {
    obj.vy += GRAVITY * DT;
    obj.y += obj.vy * DT;

    if (obj.y > GAME_HEIGHT + 100) {
      state.objects.delete(id);
      continue;
    }

    for (const [playerId, player] of state.players) {
      if (!player.alive) continue;

      if (checkCollision(player, obj)) {
        handleCollision(player, obj, state);
        if (["block", "shield", "freeze", "slow"].includes(obj.type)) {
          state.objects.delete(id);
        }
      }
    }
  }

  for (const [id, player] of state.players) {
    if (!player.alive) continue;

    if (state.gameTime * 1000 < player.freezeUntil) {
      player.vx = 0;
      player.vy = 0;
      continue;
    }

    let speedMultiplier = 1;
    if (state.gameTime * 1000 < player.slowUntil) {
      speedMultiplier = 0.3;
    }

    player.x += player.vx * DT * speedMultiplier;
    player.y += player.vy * DT * speedMultiplier;

    player.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, player.y));

    player.score += DT * 10;
  }
}

function spawnObject(state: Rooms) {
  const types = ["block", "shield", "freeze", "slow"];
  const weights = [0.7, 0.1, 0.1, 0.1];

  let random = Math.random();
  let type = "block";

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
    height: OBJECT_SIZE,
  };
  
  state.objects.set(obj.id, obj);
}

function checkCollision(player: Player, obj: GameObject): boolean {
  return (
    player.x < obj.x + obj.width &&
    player.x + PLAYER_SIZE > obj.x &&
    player.y < obj.y + obj.height &&
    player.y + PLAYER_SIZE > obj.y
  );
}

function handleCollision(player: Player, obj: GameObject, state: Rooms) {
  const now = state.gameTime * 1000;

  switch (obj.type) {
    case "block":
      if (now > player.shieldUntil) {
        player.alive = false;
      }
      break;

    case "shield":
      player.shieldUntil = now + 5000;
      break;

    case "freeze":
      for (const [id, p] of state.players) {
        if (id !== player.id) {
          p.freezeUntil = now + 3000;
        }
      }
      break;

    case "slow":
      for (const [id, p] of state.players) {
        if (id !== player.id) {
          p.slowUntil = now + 4000;
        }
      }
      break;
  }
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  socket.on("createRoom", (cb: (res: { code: string }) => void) => {
    const code = uuid().slice(0, 6).toUpperCase();
    const roomState = createRoomState();
    room.set(code, roomState);
    socket.join(code);
    socketToRoom.set(socket.id, code);
    updateRoomActivity(code);
    console.log(`Room ${code} created by ${socket.id}`);
    cb({ code });
  });

  socket.on(
    "joinRoom",
    (
      code: string,
      cb: (res: { success: boolean; message?: string }) => void
    ) => {
      console.log(`${socket.id} attempting to join room ${code}`);
      let roomState = room.get(code);
      
      if (!roomState) {
        console.log(`Room ${code} not found, creating new room`);
        roomState = createRoomState();
        room.set(code, roomState);
      }
      
      socket.join(code);
      socketToRoom.set(socket.id, code);
      updateRoomActivity(code);
      console.log(`${socket.id} joined room ${code}`);
      cb({ success: true, message: "success" });
    }
  );

  socket.on("join", (code: string, cb: (res: { success: boolean; message?: string }) => void) => {
    console.log(`${socket.id} attempting to join game in room ${code}`);
    const roomState = room.get(code);
    if (!roomState) {
      console.log(`Room ${code} not found for game join`);
      return cb({ success: false, message: "Room not found" });
    }

    if (roomState.players.has(socket.id)) {
      console.log(`Player ${socket.id} already in game`);
      socket.emit("gameInit", {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        playerId: socket.id,
      });
      return cb({ success: true, message: "Already in game" });
    }

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
      slowUntil: 0,
    };

    roomState.players.set(socket.id, player);
    updateRoomActivity(code);
    console.log(`Player ${socket.id} added to game in room ${code}. Total players: ${roomState.players.size}`);
    
    socket.emit("gameInit", {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      playerId: socket.id,
    });

    cb({ success: true, message: "Joined successfully" });
  });

  socket.on(
    "input",
    (code: string, input: { left: boolean; right: boolean; up: boolean; down: boolean }) => {
      const state = room.get(code);
      if (!state) return;
      
      const player = state.players.get(socket.id);
      if (!player || !player.alive) return;

      updateRoomActivity(code);

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
    }
  );

  socket.on("respawn", () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    
    const roomState = room.get(roomCode);
    if (!roomState) return;
    
    const player = roomState.players.get(socket.id);
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
    
    updateRoomActivity(roomCode);
    console.log(`Player ${socket.id} respawned in room ${roomCode}`);
  });

  socket.on("leaveRoom", (code: string) => {
    const roomState = room.get(code);
    if (roomState) {
      roomState.players.delete(socket.id);
      console.log(`Player ${socket.id} left room ${code}. Remaining players: ${roomState.players.size}`);
      
      if (roomState.players.size === 0) {
        console.log(`Room ${code} is now empty, scheduling cleanup`);
        scheduleRoomCleanup(code);
      }
    }
    socketToRoom.delete(socket.id);
    socket.leave(code);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      const roomState = room.get(roomCode);
      if (roomState) {
        roomState.players.delete(socket.id);
        console.log(`Player ${socket.id} removed from room ${roomCode}. Remaining players: ${roomState.players.size}`);
        
        if (roomState.players.size === 0) {
          console.log(`Room ${roomCode} is now empty, scheduling cleanup`);
          scheduleRoomCleanup(roomCode);
        }
      }
      socketToRoom.delete(socket.id);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  const oldRoomThreshold = 24 * 60 * 60 * 1000;
  
  for (const [code, roomState] of room.entries()) {
    if (now - roomState.lastActivity > oldRoomThreshold && roomState.players.size === 0) {
      console.log(`Cleaning up old inactive room ${code}`);
      if (roomState.cleanupTimeout) {
        clearTimeout(roomState.cleanupTimeout);
      }
      room.delete(code);
    }
  }
}, 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`Rooms will be kept alive for ${ROOM_CLEANUP_DELAY/1000} seconds after becoming empty`);
});