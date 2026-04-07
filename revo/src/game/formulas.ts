import { buildingDefinitions } from "../data/buildings";
import {
  baseHeadcountLimit,
  manualActionDefinitions,
  manualActionDefinitionsById,
  type BuildingId,
  type ManualActionId,
} from "../data/game-config";
import { jobDefinitions, jobDefinitionsById, type JobId } from "../data/jobs";
import {
  resourceDefinitionsById,
  type ResourceId,
} from "../data/resources";
import { techDefinitions, techDefinitionsById, type TechId } from "../data/techs";
import type { GameState } from "./state";

const RESOURCE_EPSILON = 1e-6;

function normalizeResourceValue(value: number): number {
  if (Math.abs(value) < RESOURCE_EPSILON) {
    return 0;
  }
  return Math.round(value * 1_000_000) / 1_000_000;
}

function getScaledCostAmount(baseAmount: number, scaling: number, ownedCount: number): number {
  if (baseAmount <= 0) {
    return 0;
  }

  const safeScaling = Math.max(scaling, 1);
  const safeOwnedCount = Math.max(ownedCount, 0);
  return Math.ceil(baseAmount * safeScaling ** safeOwnedCount);
}

export function getNextBuildingResourceCost(
  state: GameState,
  buildingId: BuildingId,
): Partial<Record<ResourceId, number>> {
  const building = buildingDefinitions.find((entry) => entry.id === buildingId);
  if (!building) {
    return {};
  }

  const ownedCount = state.buildings[buildingId];
  const scaling = building.costScaling ?? 1;
  return Object.fromEntries(
    Object.entries(building.cost).map(([resourceId, amount]) => [
      resourceId,
      getScaledCostAmount(amount ?? 0, scaling, ownedCount),
    ]),
  ) as Partial<Record<ResourceId, number>>;
}

export function getLastBoughtBuildingResourceCost(
  state: GameState,
  buildingId: BuildingId,
): Partial<Record<ResourceId, number>> {
  const building = buildingDefinitions.find((entry) => entry.id === buildingId);
  if (!building) {
    return {};
  }

  const ownedCount = state.buildings[buildingId];
  if (ownedCount <= 0) {
    return {};
  }

  const scaling = building.costScaling ?? 1;
  return Object.fromEntries(
    Object.entries(building.cost).map(([resourceId, amount]) => [
      resourceId,
      getScaledCostAmount(amount ?? 0, scaling, ownedCount - 1),
    ]),
  ) as Partial<Record<ResourceId, number>>;
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

export function getActiveBuildingCount(state: GameState, buildingId: BuildingId): number {
  const building = buildingDefinitions.find((entry) => entry.id === buildingId);
  if (!building) {
    return 0;
  }

  const ownedCount = Math.max(0, state.buildings[buildingId] ?? 0);
  if (!building.toggleable) {
    return ownedCount;
  }

  const activeCount = Math.max(0, state.buildingActiveCount[buildingId] ?? 0);
  return Math.min(activeCount, ownedCount);
}

export function getProductionMultiplier(state: GameState, resourceId: ResourceId): number {
  let multiplier = 1;

  for (const building of buildingDefinitions) {
    const count = getActiveBuildingCount(state, building.id);
    if (count <= 0) {
      continue;
    }
    const bonus = building.productionMultiplier?.[resourceId] ?? 0;
    multiplier += count * bonus;
  }

  for (const tech of techDefinitions) {
    if (!state.techs[tech.id]) {
      continue;
    }
    multiplier += tech.productionMultiplier?.[resourceId] ?? 0;
  }

  return Math.max(multiplier, 0);
}

function canRunConversionCycle(
  state: GameState,
  buildingId: BuildingId,
): boolean {
  const building = buildingDefinitions.find((entry) => entry.id === buildingId);
  if (!building?.conversion) {
    return false;
  }

  return (
    canAfford(state, building.conversion.inputResources ?? {}) &&
    canAffordJobs(state, building.conversion.inputJobs)
  );
}

export function getPassiveProductionPerSecond(state: GameState, resourceId: ResourceId): number {
  let total = 0;

  for (const job of jobDefinitions) {
    const count = state.jobs[job.id];
    const base = job.producesPerSecond[resourceId] ?? 0;
    total += count * base;
  }

  for (const building of buildingDefinitions) {
    const count = getActiveBuildingCount(state, building.id);
    if (count <= 0) {
      continue;
    }
    const base = building.producesPerSecond?.[resourceId] ?? 0;
    total += count * base;
  }

  return total * getProductionMultiplier(state, resourceId);
}

export function getProductionPerSecond(state: GameState, resourceId: ResourceId): number {
  const total = getPassiveProductionPerSecond(state, resourceId);
  let conversionOutput = 0;
  let conversionConsumption = 0;
  for (const building of buildingDefinitions) {
    const count = getActiveBuildingCount(state, building.id);
    const cycleSeconds = building.conversion?.cycleSeconds ?? 0;
    if (count <= 0 || cycleSeconds <= 0 || !canRunConversionCycle(state, building.id)) {
      continue;
    }
    const producedPerCycle = building.conversion?.outputResources?.[resourceId] ?? 0;
    const consumedPerCycle = building.conversion?.inputResources?.[resourceId] ?? 0;
    conversionOutput +=
      (count * producedPerCycle * getProductionMultiplier(state, resourceId)) / cycleSeconds;
    conversionConsumption += (count * consumedPerCycle) / cycleSeconds;
  }

  return total + conversionOutput - conversionConsumption;
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

function meetsCycleRequirement(state: GameState, minimumCycle: number | undefined): boolean {
  if (typeof minimumCycle !== "number") {
    return true;
  }
  return state.prestige.cycle >= minimumCycle;
}

function hasOwnedBuildingWithPrefix(state: GameState, prefix: string): boolean {
  return Object.entries(state.buildings).some(
    ([buildingId, count]) => count > 0 && buildingId.startsWith(prefix),
  );
}

function meetsUnlockRequirementSet(
  state: GameState,
  unlockWhen:
    | {
        resources?: Partial<Record<ResourceId, number>>;
        jobs?: Partial<Record<JobId, number>>;
        buildings?: Partial<Record<BuildingId, number>>;
        techs?: TechId[];
        minCycle?: number;
      }
    | undefined,
): boolean {
  return (
    meetsCycleRequirement(state, unlockWhen?.minCycle) &&
    meetsResourceRequirements(state, unlockWhen?.resources) &&
    meetsJobRequirements(state, unlockWhen?.jobs) &&
    meetsBuildingRequirements(state, unlockWhen?.buildings) &&
    meetsTechRequirements(state, unlockWhen?.techs)
  );
}

function hasManualActionProgressSignal(state: GameState, actionId: ManualActionId): boolean {
  if (actionId === "act.manual.work") {
    return (
      state.resources["res.core.project_points"] > 0 ||
      state.jobs["job.ops.staff"] > 0 ||
      state.resources["res.ops.granule_points"] > 0 ||
      state.resources["res.ops.leverage_points"] > 0 ||
      state.resources["res.ops.momentum_points"] > 0 ||
      state.resources["res.ops.matrix_points"] > 0 ||
      hasOwnedBuildingWithPrefix(state, "bld.ops.") ||
      state.techs["tech.manual.side_jobs"] ||
      state.techs["tech.cross.inservice_upskill_channel"] ||
      state.techs["tech.ops.process_management"] ||
      state.techs["tech.ops.lab_compliance"] ||
      state.prestige.cycle > 1
    );
  }

  if (actionId === "act.manual.research") {
    return (
      state.resources["res.core.topic_points"] > 0 ||
      state.jobs["job.acad.research_grad"] > 0 ||
      state.resources["res.acad.innovation_points"] > 0 ||
      state.resources["res.acad.top_journal_points"] > 0 ||
      state.resources["res.acad.youth_fund_points"] > 0 ||
      state.resources["res.acad.general_fund_points"] > 0 ||
      hasOwnedBuildingWithPrefix(state, "bld.acad.") ||
      state.techs["tech.acad.grad_admissions"] ||
      state.techs["tech.acad.peer_review"] ||
      state.techs["tech.frontier.life.ethical_sample_access"] ||
      state.prestige.cycle > 1
    );
  }

  return false;
}

export function refreshUnlockMemory(state: GameState): void {
  for (const resourceId of Object.keys(state.resources) as ResourceId[]) {
    state.unlocks.resources[resourceId] =
      state.unlocks.resources[resourceId] ||
      resourceDefinitionsById[resourceId].visibleFromStart ||
      state.resources[resourceId] > 0;
  }

  for (const action of manualActionDefinitions) {
    state.unlocks.manualActions[action.id] =
      state.unlocks.manualActions[action.id] ||
      action.unlockedFromStart ||
      meetsUnlockRequirementSet(state, action.unlockWhen) ||
      hasManualActionProgressSignal(state, action.id);
  }

  for (const job of jobDefinitions) {
    state.unlocks.jobs[job.id] =
      state.unlocks.jobs[job.id] ||
      job.unlockedFromStart ||
      state.jobs[job.id] > 0 ||
      meetsUnlockRequirementSet(state, job.unlockWhen);
  }

  for (const building of buildingDefinitions) {
    state.unlocks.buildings[building.id] =
      state.unlocks.buildings[building.id] ||
      building.unlockedFromStart ||
      state.buildings[building.id] > 0 ||
      meetsUnlockRequirementSet(state, building.unlockWhen);
  }

  for (const tech of techDefinitions) {
    state.unlocks.techs[tech.id] =
      state.unlocks.techs[tech.id] ||
      tech.unlockedFromStart ||
      state.techs[tech.id] ||
      meetsUnlockRequirementSet(state, tech.unlockWhen);
  }
}

export function isJobUnlocked(state: GameState, jobId: JobId): boolean {
  const job = jobDefinitionsById[jobId];
  if (job.unlockedFromStart || state.unlocks.jobs[job.id] || state.jobs[job.id] > 0) {
    return true;
  }

  return meetsUnlockRequirementSet(state, job.unlockWhen);
}

export function isManualActionUnlocked(
  state: GameState,
  actionId: ManualActionId,
): boolean {
  const action = manualActionDefinitionsById[actionId];
  if (
    action.unlockedFromStart ||
    state.unlocks.manualActions[action.id] ||
    hasManualActionProgressSignal(state, action.id)
  ) {
    return true;
  }

  return meetsUnlockRequirementSet(state, action.unlockWhen);
}

export function isBuildingUnlocked(state: GameState, buildingId: BuildingId): boolean {
  const building = buildingDefinitions.find((entry) => entry.id === buildingId);
  if (!building) {
    return false;
  }

  if (
    building.unlockedFromStart ||
    state.unlocks.buildings[building.id] ||
    state.buildings[building.id] > 0
  ) {
    return true;
  }

  return meetsUnlockRequirementSet(state, building.unlockWhen);
}

export function isTechUnlocked(state: GameState, techId: TechId): boolean {
  const tech = techDefinitionsById[techId];
  if (tech.unlockedFromStart || state.unlocks.techs[tech.id] || state.techs[tech.id]) {
    return true;
  }

  return meetsUnlockRequirementSet(state, tech.unlockWhen);
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

export function setBuildingActiveCount(
  state: GameState,
  buildingId: BuildingId,
  nextActiveCount: number,
): void {
  const building = buildingDefinitions.find((entry) => entry.id === buildingId);
  if (!building) {
    return;
  }

  const ownedCount = Math.max(0, state.buildings[buildingId] ?? 0);
  if (!building.toggleable) {
    state.buildingActiveCount[buildingId] = ownedCount;
    return;
  }

  const safeActiveCount = Math.max(0, Math.floor(nextActiveCount));
  state.buildingActiveCount[buildingId] = Math.min(safeActiveCount, ownedCount);
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
    frontier:
      state.prestige.cycle >= 2 ||
      state.techs["tech.cross.frontier_initiative"] ||
      state.resources["res.frontier.life.strain_points"] > 0 ||
      state.resources["res.frontier.life.variant_points"] > 0 ||
      state.resources["res.frontier.evidence_points"] > 0,
  };
}
