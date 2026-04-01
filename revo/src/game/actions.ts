import { buildingDefinitionsById, type BuildingId } from "../data/buildings";
import { manualActionDefinitions } from "../data/game-config";
import { jobDefinitionsById, type JobId } from "../data/jobs";
import { resourceNameById, type ResourceId } from "../data/resources";
import { techDefinitionsById, type TechId } from "../data/techs";
import {
  addResource,
  canAfford,
  getManualYield,
  isBuildingUnlocked,
  isJobUnlocked,
  isManualActionUnlocked,
  isTechUnlocked,
  spendCost,
} from "./formulas";
import type { GameState } from "./state";

function pushLog(state: GameState, message: string): void {
  state.log.unshift(message);
  state.log = state.log.slice(0, 10);
}

export function gatherResource(state: GameState, resourceId: ResourceId): void {
  const action = manualActionDefinitions.find(
    (entry) => entry.targetResourceId === resourceId,
  );
  if (!action) {
    return;
  }

  if (!isManualActionUnlocked(state, action.id)) {
    pushLog(state, `${action.label}尚未解锁。`);
    return;
  }

  const amount = getManualYield(state, resourceId);
  const gained = addResource(state, resourceId, amount);
  const actionLabel = action.logLabel;

  if (gained > 0) {
    pushLog(state, `${actionLabel}获得 ${gained.toFixed(1)} ${resourceNameById[resourceId]}`);
  } else {
    pushLog(state, `${resourceNameById[resourceId]}已达到上限。`);
  }
}

export function acquireJob(state: GameState, jobId: JobId): void {
  const job = jobDefinitionsById[jobId];
  if (!isJobUnlocked(state, jobId)) {
    pushLog(state, `${job.name} 还未解锁。`);
    return;
  }

  if (job.cost && !canAfford(state, job.cost)) {
    pushLog(state, `${job.name} 所需资源不足。`);
    return;
  }

  if (job.cost) {
    spendCost(state, job.cost);
  }

  state.jobs[job.id] += 1;
  pushLog(state, `${job.actionLabel}${job.name}成功。`);
}

export function buyBuilding(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (!isBuildingUnlocked(state, buildingId)) {
    pushLog(state, `${building.name} 还未解锁。`);
    return;
  }

  if (!canAfford(state, building.cost)) {
    pushLog(state, `${building.name} 所需资源不足。`);
    return;
  }

  spendCost(state, building.cost);
  state.buildings[building.id] += 1;
  pushLog(state, `建成 ${building.name}。`);
}

export function researchTech(state: GameState, techId: TechId): void {
  const tech = techDefinitionsById[techId];
  if (!isTechUnlocked(state, techId)) {
    pushLog(state, `${tech.name} 还未解锁。`);
    return;
  }

  if (state.techs[tech.id]) {
    pushLog(state, `${tech.name} 已完成。`);
    return;
  }

  if (!canAfford(state, tech.cost)) {
    pushLog(state, `${tech.name} 所需资源不足。`);
    return;
  }

  spendCost(state, tech.cost);
  state.techs[tech.id] = true;
  pushLog(state, `完成研究：${tech.name}。`);
}
