import {
  buildingDefinitions,
  buildingDefinitionsById,
  type BuildingId,
} from "../data/buildings";
import { manualActionDefinitions } from "../data/game-config";
import { jobDefinitionsById, type JobId } from "../data/jobs";
import {
  resourceDefinitions,
  resourceNameById,
  type ResourceId,
} from "../data/resources";
import { techDefinitions, techDefinitionsById, type TechId } from "../data/techs";
import {
  addResource,
  canAfford,
  canAffordJobs,
  clampAllResourcesToLimits,
  getHeadcountLimit,
  getHeadcountUsed,
  getActiveBuildingCount,
  getLastBoughtBuildingResourceCost,
  getManualYield,
  getNextBuildingResourceCost,
  getResourceLimit,
  hasHeadcountForJob,
  isBuildingUnlocked,
  isJobUnlocked,
  isManualActionUnlocked,
  isTechUnlocked,
  setBuildingActiveCount,
  spendCost,
  spendJobCost,
} from "./formulas";
import {
  FRONTIER_UNLOCK_TECH_ID,
  LIFE_TECH_IDS,
  recalculatePrestigeBonuses,
} from "./frontier";
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

export function sendResearchGradToEmployment(state: GameState): void {
  const techId: TechId = "tech.cross.reemployment_channel";
  if (!state.techs[techId]) {
    return;
  }

  if (!isJobUnlocked(state, "job.ops.staff")) {
    return;
  }

  if (state.jobs["job.acad.research_grad"] < 2) {
    return;
  }

  state.jobs["job.acad.research_grad"] -= 2;
  state.jobs["job.ops.staff"] += 1;
}

export function sendStaffToFurtherStudy(state: GameState): void {
  const techId: TechId = "tech.cross.inservice_upskill_channel";
  if (!state.techs[techId]) {
    return;
  }

  if (!isJobUnlocked(state, "job.acad.research_grad")) {
    return;
  }

  if (state.jobs["job.ops.staff"] < 2) {
    return;
  }

  state.jobs["job.ops.staff"] -= 2;
  state.jobs["job.acad.research_grad"] += 1;
}

export function buyBuilding(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (!isBuildingUnlocked(state, buildingId)) {
    return;
  }

  const nextCost = getNextBuildingResourceCost(state, buildingId);

  if (!canAfford(state, nextCost) || !canAffordJobs(state, building.jobCost)) {
    return;
  }

  spendCost(state, nextCost);
  spendJobCost(state, building.jobCost);
  state.buildings[building.id] += 1;
  if (building.toggleable) {
    const activeCount = getActiveBuildingCount(state, building.id);
    setBuildingActiveCount(state, building.id, activeCount + 1);
  }
  pushLog(state, `建成 ${building.name}。`);
}

export function sellBuilding(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (state.buildings[building.id] <= 0) {
    return;
  }

  const soldTierCost = getLastBoughtBuildingResourceCost(state, buildingId);
  state.buildings[building.id] -= 1;
  if (building.toggleable) {
    setBuildingActiveCount(state, building.id, state.buildingActiveCount[building.id]);
  }
  if (state.buildings[building.id] <= 0) {
    state.buildingConversionProgress[building.id] = 0;
  }
  clampAllResourcesToLimits(state);
  const refundText = refundHalfCost(state, soldTierCost);
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

  if (tech.exclusiveGroup) {
    const hasPickedOtherTechInGroup = techDefinitions.some((otherTech) => {
      return (
        otherTech.id !== tech.id &&
        otherTech.exclusiveGroup === tech.exclusiveGroup &&
        state.techs[otherTech.id]
      );
    });
    if (hasPickedOtherTechInGroup) {
      return;
    }
  }

  if (!canAfford(state, tech.cost) || !canAffordJobs(state, tech.jobCost)) {
    return;
  }

  spendCost(state, tech.cost);
  spendJobCost(state, tech.jobCost);
  state.techs[tech.id] = true;
  if (tech.id === FRONTIER_UNLOCK_TECH_ID) {
    for (const lifeTechId of LIFE_TECH_IDS) {
      state.unlocks.techs[lifeTechId] = true;
    }
    state.ui.activeTab = "frontier";
    pushLog(state, "未定域已开放，生命课题线已就位。");
  }
  pushLog(state, `完成研究：${tech.name}。`);
}

export function decreaseBuildingActive(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (!building.toggleable) {
    return;
  }

  const activeCount = getActiveBuildingCount(state, building.id);
  if (activeCount <= 0) {
    return;
  }

  setBuildingActiveCount(state, building.id, activeCount - 1);
  if (getActiveBuildingCount(state, building.id) <= 0) {
    state.buildingConversionProgress[building.id] = 0;
  }
}

export function increaseBuildingActive(state: GameState, buildingId: BuildingId): void {
  const building = buildingDefinitionsById[buildingId];
  if (!building.toggleable) {
    return;
  }

  const activeCount = getActiveBuildingCount(state, building.id);
  const ownedCount = Math.max(0, state.buildings[building.id]);
  if (activeCount >= ownedCount) {
    return;
  }

  setBuildingActiveCount(state, building.id, activeCount + 1);
}

export function applyDebugMaxState(state: GameState): void {
  const buildingPreset: Partial<Record<BuildingId, number>> = {
    "bld.source.university": 5,
    "bld.capacity.dorm": 5,
    "bld.capacity.apartment": 4,
    "bld.capacity.talent_community": 1,
    "bld.acad.research_group": 6,
    "bld.life.cafeteria": 3,
    "bld.org.admin_office": 3,
    "bld.ops.delivery_desk": 4,
    "bld.ops.granule_workshop": 5,
    "bld.ops.leverage_warehouse": 4,
    "bld.ops.growth_desk": 3,
    "bld.ops.matrix_lab": 2,
    "bld.conv.training_center": 3,
    "bld.conv.advisor_group": 3,
    "bld.acad.junior_faculty": 5,
    "bld.acad.manuscript_workshop": 3,
    "bld.acad.youth_fund_platform": 2,
    "bld.acad.general_fund_center": 1,
    "bld.acad.professor": 2,
    "bld.acad.changjiang_scholar": 1,
    "bld.cross.interdisciplinary_platform": 2,
  };

  const activePreset: Partial<Record<BuildingId, number>> = {
    "bld.ops.delivery_desk": 2,
    "bld.ops.leverage_warehouse": 2,
    "bld.ops.growth_desk": 1,
    "bld.ops.matrix_lab": 1,
    "bld.conv.training_center": 2,
    "bld.conv.advisor_group": 1,
    "bld.acad.manuscript_workshop": 2,
    "bld.acad.youth_fund_platform": 1,
    "bld.acad.general_fund_center": 1,
  };

  const enabledTechIds: TechId[] = [
    "tech.manual.study_notes",
    "tech.manual.side_jobs",
    "tech.acad.grad_admissions",
    "tech.cross.reemployment_channel",
    "tech.ops.process_management",
    "tech.acad.peer_review",
    "tech.ops.lab_compliance",
    "tech.cross.incubator",
    "tech.cross.frontier_initiative",
  ];

  const resourceFillRatio: Partial<Record<ResourceId, number>> = {
    "res.core.undergraduates": 0.55,
    "res.core.topic_points": 0.72,
    "res.core.project_points": 0.7,
    "res.acad.innovation_points": 0.68,
    "res.ops.granule_points": 0.62,
    "res.ops.leverage_points": 0.58,
    "res.ops.momentum_points": 0.45,
    "res.ops.matrix_points": 0.35,
    "res.acad.top_journal_points": 0.42,
    "res.acad.youth_fund_points": 0.28,
    "res.acad.general_fund_points": 0.2,
    "res.frontier.life.strain_points": 0,
    "res.frontier.life.variant_points": 0,
    "res.frontier.evidence_points": 0,
  };

  for (const building of buildingDefinitions) {
    const ownedCount = Math.max(0, Math.floor(buildingPreset[building.id] ?? 0));
    const preferredActiveCount = Math.max(0, Math.floor(activePreset[building.id] ?? ownedCount));
    state.buildings[building.id] = ownedCount;
    state.buildingActiveCount[building.id] = building.toggleable
      ? Math.min(preferredActiveCount, ownedCount)
      : ownedCount;
    state.buildingConversionProgress[building.id] = 0;
  }

  for (const tech of techDefinitions) {
    state.techs[tech.id] = false;
  }
  for (const techId of enabledTechIds) {
    state.techs[techId] = true;
  }

  state.jobs["job.ops.staff"] = 14;
  state.jobs["job.acad.research_grad"] = 10;

  const headcountUsed = getHeadcountUsed(state);
  const headcountLimit = getHeadcountLimit(state);
  if (headcountUsed > headcountLimit) {
    const overflow = headcountUsed - headcountLimit;
    state.jobs["job.ops.staff"] = Math.max(0, state.jobs["job.ops.staff"] - overflow);
  }

  for (const resource of resourceDefinitions) {
    const limit = getResourceLimit(state, resource.id);
    const ratio = resourceFillRatio[resource.id] ?? 0.6;
    state.resources[resource.id] = Math.max(0, Math.floor(limit * ratio * 100) / 100);
  }

  state.prestige.cycle = 1;
  state.prestige.academicLineage = 0;
  state.prestige.starCharts = 0;
  state.frontier.lifePity = 0;
  state.ui.activeTab = "campus";
  recalculatePrestigeBonuses(state);
  clampAllResourcesToLimits(state);
  pushLog(state, "测试模式已填充第一周目后期模板状态。");
}
