export type GameObject = {
  id: string;
  x: number;
  y: number;
  vy: number;
  type: "block" | "shield" | "freeze" | "slow";
  width: number;
  height: number;
}