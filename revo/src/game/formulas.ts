import { buildingDefinitions } from "../data/buildings";
import {
  baseHeadcountLimit,
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
const RESOURCE_EPSILON = 1e-6;

function normalizeResourceValue(value: number): number {
  if (Math.abs(value) < RESOURCE_EPSILON) {
    return 0;
  }
  return Math.round(value * 1_000_000) / 1_000_000;
}

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
  const next = normalizeResourceValue(Math.min(current + amount, limit));
  state.resources[resourceId] = next;
  return normalizeResourceValue(next - current);
}

export function clampAllResourcesToLimits(state: GameState): void {
  for (const resourceId of Object.keys(state.resources) as ResourceId[]) {
    const limit = getResourceLimit(state, resourceId);
    if (state.resources[resourceId] > limit) {
      state.resources[resourceId] = normalizeResourceValue(limit);
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
    if (building.toggleable && !state.buildingEnabled[building.id]) {
      continue;
    }
    const count = state.buildings[building.id];
    const base = building.producesPerSecond?.[resourceId] ?? 0;
    total += count * base;
  }

  let multiplier = 1;
  for (const building of buildingDefinitions) {
    if (building.toggleable && !state.buildingEnabled[building.id]) {
      continue;
    }
    const count = state.buildings[building.id];
    const bonus = building.productionMultiplier?.[resourceId] ?? 0;
    multiplier += count * bonus;
  }

  let conversionConsumption = 0;
  for (const building of buildingDefinitions) {
    if (building.toggleable && !state.buildingEnabled[building.id]) {
      continue;
    }
    const count = state.buildings[building.id];
    const cycleSeconds = building.conversion?.cycleSeconds ?? 0;
    if (count <= 0 || cycleSeconds <= 0) {
      continue;
    }
    const consumedPerCycle = building.conversion?.inputResources?.[resourceId] ?? 0;
    conversionConsumption += (count * consumedPerCycle) / cycleSeconds;
  }

  return total * multiplier - conversionConsumption;
}

export function getHeadcountLimit(state: GameState): number {
  let total = baseHeadcountLimit;

  for (const building of buildingDefinitions) {
    const count = state.buildings[building.id];
    const bonus = building.headcountBonus ?? 0;
    total += count * bonus;
  }

  return Math.max(0, total);
}

export function getHeadcountUsed(state: GameState): number {
  let total = 0;
  for (const job of jobDefinitions) {
    total += state.jobs[job.id] * (job.headcountCost ?? 1);
  }
  return total;
}

export function hasHeadcountForJob(state: GameState, jobId: JobId): boolean {
  const job = jobDefinitionsById[jobId];
  return getHeadcountUsed(state) + (job.headcountCost ?? 1) <= getHeadcountLimit(state);
}

export function hasHeadcountForJobs(
  state: GameState,
  jobs: Partial<Record<JobId, number>> | undefined,
): boolean {
  if (!jobs) {
    return true;
  }

  let added = 0;
  for (const [jobId, amount] of Object.entries(jobs)) {
    if ((amount ?? 0) <= 0) {
      continue;
    }
    const headcountCost = jobDefinitionsById[jobId as JobId].headcountCost ?? 1;
    added += headcountCost * (amount ?? 0);
  }
  return getHeadcountUsed(state) + added <= getHeadcountLimit(state);
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
    return (
      state.resources[resourceId as ResourceId] + RESOURCE_EPSILON >=
      (amount ?? 0)
    );
  });
}

export function canAffordJobs(
  state: GameState,
  cost: Partial<Record<JobId, number>> | undefined,
): boolean {
  if (!cost) {
    return true;
  }

  return Object.entries(cost).every(([jobId, amount]) => {
    return state.jobs[jobId as JobId] + RESOURCE_EPSILON >= (amount ?? 0);
  });
}

export function spendCost(
  state: GameState,
  cost: Partial<Record<ResourceId, number>>,
): void {
  for (const [resourceId, amount] of Object.entries(cost)) {
    const current = state.resources[resourceId as ResourceId];
    const next = normalizeResourceValue(Math.max(0, current - (amount ?? 0)));
    state.resources[resourceId as ResourceId] = next;
  }
}

export function spendJobCost(
  state: GameState,
  cost: Partial<Record<JobId, number>> | undefined,
): void {
  if (!cost) {
    return;
  }

  for (const [jobId, amount] of Object.entries(cost)) {
    const current = state.jobs[jobId as JobId];
    const next = normalizeResourceValue(Math.max(0, current - (amount ?? 0)));
    state.jobs[jobId as JobId] = next;
  }
}

export function setBuildingEnabled(
  state: GameState,
  buildingId: BuildingId,
  enabled: boolean,
): void {
  state.buildingEnabled[buildingId] = enabled;
}

export function getUnlockedFlags(state: GameState) {
  return {
    researchGraduate: isJobUnlocked(state, "job.acad.research_grad"),
    apartment: isBuildingUnlocked(state, "bld.capacity.apartment"),
    professor: isBuildingUnlocked(state, "bld.acad.professor"),
    changjiangScholar: isBuildingUnlocked(state, "bld.acad.changjiang_scholar"),
    gradAdmissions: isTechUnlocked(state, "tech.acad.grad_admissions"),
    processManagement: isTechUnlocked(state, "tech.ops.process_management"),
    innovation:
      state.jobs["job.acad.research_grad"] >= 1 ||
      state.buildings["bld.acad.junior_faculty"] >= 1 ||
      state.resources["res.acad.innovation_points"] > 0,
    space:
      state.resources["res.core.topic_points"] >= 120 &&
      state.resources["res.core.project_points"] >= 80,
  };
}
