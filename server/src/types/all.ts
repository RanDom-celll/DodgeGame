export type Player = {
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

export type GameObject = {
  id: string;
  x: number;
  y: number;
  vy: number;
  type: "block" | "shield" | "freeze" | "slow";
  width: number;
  height: number;
}

export type Rooms = {
  players: Map<string, Player>;
  objects: Map<string, GameObject>;
  lastSpawn: number;
  gameTime: number;
  createdAt: number;
  lastActivity: number;
  cleanupTimeout?: NodeJS.Timeout;
}