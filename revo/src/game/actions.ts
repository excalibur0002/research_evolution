import { buildingDefinitionsById, type BuildingId } from "../data/buildings";
import { manualActionDefinitions } from "../data/game-config";
import { jobDefinitionsById, jobNameById, type JobId } from "../data/jobs";
import { resourceNameById, type ResourceId } from "../data/resources";
import { techDefinitionsById, type TechId } from "../data/techs";
import {
  addResource,
  canAfford,
  canAffordJobs,
  clampAllResourcesToLimits,
  getManualYield,
  hasHeadcountForJob,
  isBuildingUnlocked,
  isJobUnlocked,
  isManualActionUnlocked,
  isTechUnlocked,
  setBuildingEnabled,
  spendCost,
  spendJobCost,
} from "./formulas";
import type { GameState } from "./state";

function pushLog(state: GameState, message: string): void {
  state.log.unshift(message);
  state.log = state.log.slice(0, 10);
}

function refundHalfCost(
  state: GameState,
  cost: Partial<Record<ResourceId, number>>,
): string {
  const refundChunks: string[] = [];

  for (const [resourceId, amount] of Object.entries(cost)) {
    const refundAmount = (amount ?? 0) * 0.5;
    if (refundAmount <= 0) {
      continue;
    }

    const gained = addResource(state, resourceId as ResourceId, refundAmount);
    if (gained > 0) {
      refundChunks.push(`${gained.toFixed(2)} ${resourceNameById[resourceId as ResourceId]}`);
    }
  }

  return refundChunks.join(" / ");
}

export function gatherResource(state: GameState, resourceId: ResourceId): void {
  const action = manualActionDefinitions.find(
    (entry) => entry.targetResourceId === resourceId,
  );
  if (!action) {
    return;
  }

  if (!isManualActionUnlocked(state, action.id)) {
    return;
  }

  const amount = getManualYield(state, resourceId);
  addResource(state, resourceId, amount);
}

export function acquireJob(state: GameState, jobId: JobId): void {
  const job = jobDefinitionsById[jobId];
  if (!isJobUnlocked(state, jobId)) {
    return;
  }

  if (job.cost && !canAfford(state, job.cost)) {
    return;
  }

  if (!hasHeadcountForJob(state, jobId)) {
    return;
  }

  if (job.cost) {
    spendCost(state, job.cost);
  }

  state.jobs[job.id] += 1;
}

export function sellJob(state: GameState, jobId: JobId): void {
  const job = jobDefinitionsById[jobId];
  if (state.jobs[job.id] <= 0) {
    return;
  }

  state.jobs[job.id] -= 1;
}

export function buyBuilding(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (!isBuildingUnlocked(state, buildingId)) {
    return;
  }

  if (!canAfford(state, building.cost) || !canAffordJobs(state, building.jobCost)) {
    return;
  }

  spendCost(state, building.cost);
  spendJobCost(state, building.jobCost);
  if (building.toggleable && state.buildings[building.id] <= 0) {
    setBuildingEnabled(state, building.id, true);
  }
  state.buildings[building.id] += 1;
  pushLog(state, `建成 ${building.name}。`);
}

export function sellBuilding(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (state.buildings[building.id] <= 0) {
    return;
  }

  state.buildings[building.id] -= 1;
  if (state.buildings[building.id] <= 0) {
    setBuildingEnabled(state, building.id, true);
    state.buildingConversionProgress[building.id] = 0;
  }
  clampAllResourcesToLimits(state);
  const refundText = refundHalfCost(state, building.cost);
  if (refundText) {
    pushLog(state, `出售${building.name}，返还 ${refundText}。`);
  } else {
    pushLog(state, `出售${building.name}。`);
  }
}

export function researchTech(state: GameState, techId: TechId): void {
  const tech = techDefinitionsById[techId];
  if (!isTechUnlocked(state, techId)) {
    return;
  }

  if (state.techs[tech.id]) {
    return;
  }

  if (!canAfford(state, tech.cost) || !canAffordJobs(state, tech.jobCost)) {
    return;
  }

  spendCost(state, tech.cost);
  spendJobCost(state, tech.jobCost);
  state.techs[tech.id] = true;
  pushLog(state, `完成研究：${tech.name}。`);
}

export function toggleBuilding(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (!building.toggleable) {
    pushLog(state, `${building.name} 不支持开关。`);
    return;
  }

  if (state.buildings[building.id] <= 0) {
    pushLog(state, `你还没有可切换的${building.name}。`);
    return;
  }

  const enabled = state.buildingEnabled[building.id];
  const nextEnabled = !enabled;
  setBuildingEnabled(state, building.id, nextEnabled);
  if (!nextEnabled) {
    state.buildingConversionProgress[building.id] = 0;
  }

  if (nextEnabled) {
    pushLog(state, `开启${building.name}，自动沉淀恢复运行。`);
    return;
  }
  const outputText = Object.entries(building.conversion?.outputJobs ?? {})
    .map(([jobId, amount]) => `${amount}${jobNameById[jobId as JobId]}`)
    .join(" / ");
  pushLog(state, `关闭${building.name}${outputText ? `（暂停${outputText}产出）` : ""}。`);
}
