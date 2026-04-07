import { buildingDefinitions } from "../data/buildings";
import type { JobId } from "../data/jobs";
import { resourceDefinitions, type ResourceId } from "../data/resources";
import {
  addResource,
  canAfford,
  canAffordJobs,
  clampAllResourcesToLimits,
  getActiveBuildingCount,
  getPassiveProductionPerSecond,
  getProductionMultiplier,
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

    const activeCount = getActiveBuildingCount(state, building.id);
    if (activeCount <= 0) {
      state.buildingConversionProgress[building.id] = 0;
      continue;
    }

    const cycleSeconds = Math.max(conversion.cycleSeconds, 0.1);
    const progressGain = (deltaSeconds * activeCount) / cycleSeconds;
    state.buildingConversionProgress[building.id] += progressGain;

    while (state.buildingConversionProgress[building.id] >= 1) {
      const outputJobs = conversion.outputJobs ?? {};
      const outputResources = conversion.outputResources ?? {};
      if (
        !canAfford(state, conversion.inputResources ?? {}) ||
        !canAffordJobs(state, conversion.inputJobs) ||
        !hasHeadcountForJobs(state, outputJobs)
      ) {
        // Prevent "debt-like" backlog from growing without bound when a line is starved.
        // Keeping at most one pending cycle preserves responsiveness once resources recover.
        state.buildingConversionProgress[building.id] = Math.min(
          state.buildingConversionProgress[building.id],
          1,
        );
        break;
      }

      spendCost(state, conversion.inputResources ?? {});
      spendJobCost(state, conversion.inputJobs);

      for (const [jobId, amount] of Object.entries(outputJobs)) {
        state.jobs[jobId as JobId] += amount ?? 0;
        jobsChanged = true;
      }

      for (const [resourceId, amount] of Object.entries(outputResources)) {
        const multipliedAmount =
          (amount ?? 0) * getProductionMultiplier(state, resourceId as ResourceId);
        addResource(state, resourceId as ResourceId, multipliedAmount);
      }

      state.buildingConversionProgress[building.id] -= 1;
    }
  }

  return jobsChanged;
}

export function advanceGame(state: GameState, deltaSeconds: number): boolean {
  const hasJobChanges = processBuildingConversions(state, deltaSeconds);

  for (const resource of resourceDefinitions) {
    const gain = getPassiveProductionPerSecond(state, resource.id) * deltaSeconds;
    if (gain > 0) {
      addResource(state, resource.id, gain);
    }
  }
  clampAllResourcesToLimits(state);
  return hasJobChanges;
}
