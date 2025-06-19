export type FallingObject = {
  id: string;
  x: number;
  y: number;
  type: "block" | "shield" | "freeze" | "slow";
};