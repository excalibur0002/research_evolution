import { buildingDefinitions } from "../data/buildings";
import type { JobId } from "../data/jobs";
import { resourceDefinitions } from "../data/resources";
import {
  addResource,
  canAfford,
  canAffordJobs,
  clampAllResourcesToLimits,
  getProductionPerSecond,
  hasHeadcountForJobs,
  spendCost,
  spendJobCost,
} from "./formulas";
import type { GameState } from "./state";

function processBuildingConversions(state: GameState, deltaSeconds: number): boolean {
  let jobsChanged = false;

  for (const building of buildingDefinitions) {
    const conversion = building.conversion;
    if (!conversion) {
      continue;
    }

    if (!state.buildingEnabled[building.id]) {
      continue;
    }

    const ownedCount = state.buildings[building.id];
    if (ownedCount <= 0) {
      state.buildingConversionProgress[building.id] = 0;
      continue;
    }

    const cycleSeconds = Math.max(conversion.cycleSeconds, 0.1);
    const progressGain = (deltaSeconds * ownedCount) / cycleSeconds;
    state.buildingConversionProgress[building.id] = Math.min(
      1,
      state.buildingConversionProgress[building.id] + progressGain,
    );

    while (state.buildingConversionProgress[building.id] >= 1) {
      if (
        !canAfford(state, conversion.inputResources ?? {}) ||
        !canAffordJobs(state, conversion.inputJobs) ||
        !hasHeadcountForJobs(state, conversion.outputJobs)
      ) {
        break;
      }

      spendCost(state, conversion.inputResources ?? {});
      spendJobCost(state, conversion.inputJobs);
      for (const [jobId, amount] of Object.entries(conversion.outputJobs)) {
        state.jobs[jobId as JobId] += amount ?? 0;
        jobsChanged = true;
      }
      state.buildingConversionProgress[building.id] -= 1;
    }
  }

  return jobsChanged;
}

export function advanceGame(state: GameState, deltaSeconds: number): boolean {
  const hasJobChanges = processBuildingConversions(state, deltaSeconds);

  for (const resource of resourceDefinitions) {
    const gain = getProductionPerSecond(state, resource.id) * deltaSeconds;
    if (gain > 0) {
      addResource(state, resource.id, gain);
    }
  }
  clampAllResourcesToLimits(state);
  return hasJobChanges;
}
