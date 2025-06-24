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