import { resourceDefinitions } from "../data/resources";
import { addResource, clampAllResourcesToLimits, getProductionPerSecond } from "./formulas";
import type { GameState } from "./state";

export function advanceGame(state: GameState, deltaSeconds: number): void {
  for (const resource of resourceDefinitions) {
    const gain = getProductionPerSecond(state, resource.id) * deltaSeconds;
    if (gain > 0) {
      addResource(state, resource.id, gain);
    }
  }
  clampAllResourcesToLimits(state);
}
