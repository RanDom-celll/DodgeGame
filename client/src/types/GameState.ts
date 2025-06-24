import type { Player } from "./Player";
import type { GameObject } from "./FallingObject";
export type GameState = {
  players: Player[];
  objects: GameObject[];
  gameTime: number;
}