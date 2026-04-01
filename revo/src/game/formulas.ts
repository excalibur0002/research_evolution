import { buildingDefinitions } from "../data/buildings";
import {
  manualActionDefinitions,
  manualActionDefinitionsById,
  type ManualActionId,
} from "../data/game-config";
import { jobDefinitions, jobDefinitionsById, type JobId } from "../data/jobs";
import {
  resourceDefinitionsById,
  type ResourceId,
} from "../data/resources";
import { techDefinitionsById, type TechId } from "../data/techs";
import type { GameState } from "./state";

type BuildingId = (typeof buildingDefinitions)[number]["id"];

export function getManualYield(state: GameState, resourceId: ResourceId): number {
  const action = manualActionDefinitions.find(
    (entry) => entry.targetResourceId === resourceId,
  );
  if (!action) {
    return 0;
  }

  if (!action.boostTechId || typeof action.boostedYield !== "number") {
    return action.baseYield;
  }

  return state.techs[action.boostTechId] ? action.boostedYield : action.baseYield;
}

export function getResourceLimit(state: GameState, resourceId: ResourceId): number {
  let total = resourceDefinitionsById[resourceId].baseLimit;

  for (const building of buildingDefinitions) {
    const count = state.buildings[building.id];
    const bonus = building.resourceLimitBonus?.[resourceId] ?? 0;
    total += count * bonus;
  }

  for (const techId of Object.keys(state.techs) as TechId[]) {
    if (!state.techs[techId]) {
      continue;
    }
    total += techDefinitionsById[techId].resourceLimitBonus?.[resourceId] ?? 0;
  }

  return Math.max(total, 0);
}

export function addResource(state: GameState, resourceId: ResourceId, amount: number): number {
  if (amount <= 0) {
    return 0;
  }

  const current = state.resources[resourceId];
  const limit = getResourceLimit(state, resourceId);
  const next = Math.min(current + amount, limit);
  state.resources[resourceId] = next;
  return next - current;
}

export function clampAllResourcesToLimits(state: GameState): void {
  for (const resourceId of Object.keys(state.resources) as ResourceId[]) {
    const limit = getResourceLimit(state, resourceId);
    if (state.resources[resourceId] > limit) {
      state.resources[resourceId] = limit;
    }
  }
}

export function getProductionPerSecond(state: GameState, resourceId: ResourceId): number {
  let total = 0;

  for (const job of jobDefinitions) {
    const count = state.jobs[job.id];
    const base = job.producesPerSecond[resourceId] ?? 0;
    total += count * base;
  }

  for (const building of buildingDefinitions) {
    const count = state.buildings[building.id];
    const base = building.producesPerSecond?.[resourceId] ?? 0;
    total += count * base;
  }

  let multiplier = 1;
  for (const building of buildingDefinitions) {
    const count = state.buildings[building.id];
    const bonus = building.productionMultiplier?.[resourceId] ?? 0;
    multiplier += count * bonus;
  }

  return total * multiplier;
}

function meetsResourceRequirements(
  state: GameState,
  requirements: Partial<Record<ResourceId, number>> | undefined,
): boolean {
  if (!requirements) {
    return true;
  }

  return Object.entries(requirements).every(([resourceId, amount]) => {
    return state.resources[resourceId as ResourceId] >= (amount ?? 0);
  });
}

function meetsJobRequirements(
  state: GameState,
  requirements: Partial<Record<JobId, number>> | undefined,
): boolean {
  if (!requirements) {
    return true;
  }

  return Object.entries(requirements).every(([jobId, amount]) => {
    return state.jobs[jobId as JobId] >= (amount ?? 0);
  });
}

function meetsBuildingRequirements(
  state: GameState,
  requirements: Partial<Record<BuildingId, number>> | undefined,
): boolean {
  if (!requirements) {
    return true;
  }

  return Object.entries(requirements).every(([buildingId, amount]) => {
    return state.buildings[buildingId as BuildingId] >= (amount ?? 0);
  });
}

function meetsTechRequirements(state: GameState, requirements: TechId[] | undefined): boolean {
  if (!requirements) {
    return true;
  }

  return requirements.every((techId) => state.techs[techId]);
}

export function isJobUnlocked(state: GameState, jobId: JobId): boolean {
  const job = jobDefinitionsById[jobId];
  if (job.unlockedFromStart) {
    return true;
  }

  return (
    meetsResourceRequirements(state, job.unlockWhen?.resources) &&
    meetsJobRequirements(state, job.unlockWhen?.jobs) &&
    meetsBuildingRequirements(state, job.unlockWhen?.buildings) &&
    meetsTechRequirements(state, job.unlockWhen?.techs)
  );
}

export function isManualActionUnlocked(
  state: GameState,
  actionId: ManualActionId,
): boolean {
  const action = manualActionDefinitionsById[actionId];
  if (action.unlockedFromStart) {
    return true;
  }

  return (
    meetsResourceRequirements(state, action.unlockWhen?.resources) &&
    meetsJobRequirements(state, action.unlockWhen?.jobs) &&
    meetsBuildingRequirements(state, action.unlockWhen?.buildings) &&
    meetsTechRequirements(state, action.unlockWhen?.techs)
  );
}

export function isBuildingUnlocked(state: GameState, buildingId: BuildingId): boolean {
  const building = buildingDefinitions.find((entry) => entry.id === buildingId);
  if (!building) {
    return false;
  }

  if (building.unlockedFromStart) {
    return true;
  }

  return (
    meetsResourceRequirements(state, building.unlockWhen?.resources) &&
    meetsJobRequirements(state, building.unlockWhen?.jobs) &&
    meetsBuildingRequirements(state, building.unlockWhen?.buildings) &&
    meetsTechRequirements(state, building.unlockWhen?.techs)
  );
}

export function isTechUnlocked(state: GameState, techId: TechId): boolean {
  const tech = techDefinitionsById[techId];
  if (tech.unlockedFromStart) {
    return true;
  }

  return (
    meetsResourceRequirements(state, tech.unlockWhen?.resources) &&
    meetsJobRequirements(state, tech.unlockWhen?.jobs) &&
    meetsBuildingRequirements(state, tech.unlockWhen?.buildings) &&
    meetsTechRequirements(state, tech.unlockWhen?.techs)
  );
}

export function canAfford(
  state: GameState,
  cost: Partial<Record<ResourceId, number>>,
): boolean {
  return Object.entries(cost).every(([resourceId, amount]) => {
    return state.resources[resourceId as ResourceId] >= (amount ?? 0);
  });
}

export function spendCost(
  state: GameState,
  cost: Partial<Record<ResourceId, number>>,
): void {
  for (const [resourceId, amount] of Object.entries(cost)) {
    state.resources[resourceId as ResourceId] -= amount ?? 0;
  }
}

export function getUnlockedFlags(state: GameState) {
  return {
    researchGraduate: isJobUnlocked(state, "job.acad.research_grad"),
    apartment: isBuildingUnlocked(state, "bld.capacity.apartment"),
    professor: isBuildingUnlocked(state, "bld.acad.professor"),
    changjiangScholar: isBuildingUnlocked(state, "bld.acad.changjiang_scholar"),
    gradAdmissions: isTechUnlocked(state, "tech.acad.grad_admissions"),
    processManagement: isTechUnlocked(state, "tech.ops.process_management"),
    space:
      state.resources["res.core.topic_points"] >= 120 &&
      state.resources["res.core.project_points"] >= 80,
  };
}
