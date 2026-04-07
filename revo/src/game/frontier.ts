import { type BuildingId } from "../data/buildings";
import type { ResourceId } from "../data/resources";
import type { TechId } from "../data/techs";
import { formatAwakeningGainLog, formatLifeDropDescription, uiCopy } from "../data/ui-copy";
import {
  addResource,
  canAfford,
  clampAllResourcesToLimits,
  spendCost,
} from "./formulas";
import { createInitialState, type GameState } from "./state";

const LIFE_SINGLE_COST: Partial<Record<ResourceId, number>> = {
  "res.frontier.life.strain_points": 12,
  "res.acad.top_journal_points": 1,
  "res.ops.leverage_points": 1,
};

const LIFE_MULTI_COST: Partial<Record<ResourceId, number>> = {
  "res.frontier.life.strain_points": 108,
  "res.acad.top_journal_points": 9,
  "res.ops.leverage_points": 9,
};

export const LIFE_BUILDING_IDS = [
  "bld.frontier.life.sample_center",
  "bld.frontier.life.continuous_culture_chamber",
  "bld.frontier.life.multiomics_platform",
  "bld.frontier.life.phenotype_screening_station",
  "bld.frontier.life.directed_evolution_bench",
] as const satisfies readonly BuildingId[];

export const LIFE_TECH_IDS = [
  "tech.frontier.life.ethical_sample_access",
  "tech.frontier.life.high_throughput_sequencing",
  "tech.frontier.life.co_culture_model",
  "tech.frontier.life.directed_evolution_protocol",
  "tech.frontier.life.exogenous_lineage_alignment",
] as const satisfies readonly TechId[];

export const FRONTIER_UNLOCK_TECH_ID = "tech.cross.frontier_initiative" as const;
const ACADEMIC_LINEAGE_CONVERSION_RATE = 10;

export type LifeOutcomeKind = "evidence" | "strain" | "variant" | "star";

export type LifeBreakthroughSummary = {
  pulls: number;
  evidenceGained: number;
  strainGained: number;
  variantGained: number;
  starChartsGained: number;
  outcomeCounts: Record<LifeOutcomeKind, number>;
  pityBefore: number;
  pityAfter: number;
};

export type AwakeningPreview = {
  studyTraceGain: number;
  lineageGain: number;
  conversionRate: number;
  nextCycle: number;
  currentMultiplier: number;
  nextMultiplier: number;
  unlockText: string;
};

export type DropTableEntry = {
  label: string;
  chance: number;
  description: string;
};

function countBuilding(state: GameState, buildingId: BuildingId): number {
  return Math.max(0, state.buildings[buildingId] ?? 0);
}

export function isFrontierBuildingId(buildingId: BuildingId): boolean {
  return buildingId.startsWith("bld.frontier.");
}

export function isFrontierTechId(techId: TechId): boolean {
  return techId.startsWith("tech.frontier.");
}

export function isLifeBuildingId(buildingId: BuildingId): boolean {
  return buildingId.startsWith("bld.frontier.life.");
}

export function isLifeTechId(techId: TechId): boolean {
  return techId.startsWith("tech.frontier.life.");
}

export function isLifeModuleUnlocked(state: GameState): boolean {
  return (
    state.techs[FRONTIER_UNLOCK_TECH_ID] ||
    state.prestige.cycle >= 2 ||
    LIFE_TECH_IDS.some((techId) => state.techs[techId]) ||
    LIFE_BUILDING_IDS.some((buildingId) => state.buildings[buildingId] > 0) ||
    state.resources["res.frontier.life.strain_points"] > 0 ||
    state.resources["res.frontier.life.variant_points"] > 0 ||
    state.resources["res.frontier.evidence_points"] > 0 ||
    state.frontier.lifePity > 0 ||
    state.prestige.starCharts > 0
  );
}

export function getLifeBreakthroughCost(pulls: number): Partial<Record<ResourceId, number>> {
  return pulls >= 10 ? LIFE_MULTI_COST : LIFE_SINGLE_COST;
}

export function isParallelLifeBreakthroughUnlocked(state: GameState): boolean {
  return state.techs["tech.frontier.life.high_throughput_sequencing"];
}

export function getTimeAccelerationBonus(
  cycle: number,
  academicLineage: number,
  starCharts: number,
): number {
  return 1 + cycle * 0.18 + Math.sqrt(Math.max(0, academicLineage)) * 0.05 + starCharts * 0.03;
}

export function recalculatePrestigeBonuses(state: GameState): void {
  const bonus = getTimeAccelerationBonus(
    state.prestige.cycle,
    state.prestige.academicLineage,
    state.prestige.starCharts,
  );
  state.prestige.timeAccelerationBonus = bonus;
  state.time.prestigeMultiplier = bonus;
}

export function getAwakeningStudyTraceGain(state: GameState): number {
  const score =
    state.resources["res.acad.top_journal_points"] * 1.2 +
    state.resources["res.acad.youth_fund_points"] * 4 +
    state.resources["res.acad.general_fund_points"] * 9 +
    state.resources["res.ops.leverage_points"] * 0.5 +
    state.resources["res.ops.momentum_points"] * 2 +
    state.resources["res.ops.matrix_points"] * 5 +
    state.resources["res.frontier.life.variant_points"] * 14 +
    countBuilding(state, "bld.acad.professor") * 1.5 +
    countBuilding(state, "bld.cross.interdisciplinary_platform") * 2 +
    countBuilding(state, "bld.frontier.life.sample_center") * 2.5;
  const gain = Math.floor(score / 8);

  if (
    gain < 1 &&
    (state.resources["res.acad.top_journal_points"] >= 2 ||
      state.resources["res.acad.youth_fund_points"] >= 1 ||
      state.resources["res.acad.general_fund_points"] >= 1 ||
      state.resources["res.frontier.life.variant_points"] >= 1)
  ) {
    return 1;
  }

  return Math.max(0, gain);
}

export function getAwakeningPreview(state: GameState): AwakeningPreview {
  const studyTraceGain = getAwakeningStudyTraceGain(state);
  const lineageGain = Math.floor(studyTraceGain / ACADEMIC_LINEAGE_CONVERSION_RATE);
  const nextCycle = state.prestige.cycle + (lineageGain > 0 ? 1 : 0);
  const nextMultiplier =
    lineageGain > 0
      ? getTimeAccelerationBonus(
          nextCycle,
          state.prestige.academicLineage + lineageGain,
          state.prestige.starCharts,
        )
      : state.time.prestigeMultiplier;
  const unlockText =
    state.prestige.cycle === 1 && lineageGain > 0
        ? uiCopy.frontier.system.unlockTextFirst
      : lineageGain > 0
        ? uiCopy.frontier.system.unlockTextRepeat
        : uiCopy.frontier.system.unlockTextBlocked;

  return {
    studyTraceGain,
    lineageGain,
    conversionRate: ACADEMIC_LINEAGE_CONVERSION_RATE,
    nextCycle,
    currentMultiplier: state.time.prestigeMultiplier,
    nextMultiplier,
    unlockText,
  };
}

export function canAwaken(state: GameState): boolean {
  return getAwakeningPreview(state).lineageGain > 0;
}

function getLifeLowTierEvidenceBonus(state: GameState): number {
  let bonus = countBuilding(state, "bld.frontier.life.phenotype_screening_station");
  if (state.techs["tech.frontier.life.co_culture_model"]) {
    bonus += 2;
  }
  return bonus;
}

function getLifeVariantChance(state: GameState): number {
  const cycleBonus = state.prestige.cycle * 0.0012;
  const lineageBonus = Math.sqrt(Math.max(0, state.prestige.academicLineage)) * 0.00035;
  const buildingBonus = countBuilding(state, "bld.frontier.life.phenotype_screening_station") * 0.0025;
  const techBonus = state.techs["tech.frontier.life.directed_evolution_protocol"] ? 0.008 : 0;
  return Math.min(0.12, 0.018 + cycleBonus + lineageBonus + buildingBonus + techBonus);
}

function getLifeStarChance(state: GameState): number {
  if (!state.techs["tech.frontier.life.exogenous_lineage_alignment"]) {
    return 0;
  }

  const cycleBonus = state.prestige.cycle * 0.00005;
  const lineageBonus = state.prestige.academicLineage * 0.000003;
  return Math.min(0.0015, 0.00025 + cycleBonus + lineageBonus);
}

export function getLifePityThreshold(state: GameState): number {
  const buildingReduction = countBuilding(state, "bld.frontier.life.directed_evolution_bench") * 2;
  const techReduction = state.techs["tech.frontier.life.directed_evolution_protocol"] ? 6 : 0;
  return Math.max(12, 30 - buildingReduction - techReduction);
}

export function getLifeDropTable(state: GameState): DropTableEntry[] {
  const starChance = getLifeStarChance(state);
  const variantChance = getLifeVariantChance(state);
  const strainChance = 0.25;
  const evidenceChance = Math.max(0, 1 - starChance - variantChance - strainChance);
  const evidenceAmount = 3 + getLifeLowTierEvidenceBonus(state);
  const strainAmount = 6;
  const evidenceBonus = getLifeLowTierEvidenceBonus(state);

  return [
    {
      label: uiCopy.frontier.breakthrough.dropLabels.evidence,
      chance: evidenceChance,
      description: formatLifeDropDescription("evidence", {
        evidenceAmount,
      }),
    },
    {
      label: uiCopy.frontier.breakthrough.dropLabels.strain,
      chance: strainChance,
      description: formatLifeDropDescription("strain", {
        strainAmount,
        evidenceBonus,
      }),
    },
    {
      label: uiCopy.frontier.breakthrough.dropLabels.variant,
      chance: variantChance,
      description: formatLifeDropDescription("variant", {
        variantAmount: 1,
      }),
    },
    {
      label: uiCopy.frontier.breakthrough.dropLabels.star,
      chance: starChance,
      description: formatLifeDropDescription("star", {
        starAmount: 0.01,
      }),
    },
  ];
}

export function canRunLifeBreakthrough(state: GameState, pulls: number): boolean {
  if (!isLifeModuleUnlocked(state)) {
    return false;
  }
  if (pulls >= 10 && !isParallelLifeBreakthroughUnlocked(state)) {
    return false;
  }
  return canAfford(state, getLifeBreakthroughCost(pulls));
}

function addLifeEvidence(state: GameState, amount: number): number {
  return addResource(state, "res.frontier.evidence_points", amount);
}

function resolveLifeOutcome(state: GameState): LifeOutcomeKind {
  const pityThreshold = getLifePityThreshold(state);
  if (state.frontier.lifePity + 1 >= pityThreshold) {
    return "variant";
  }

  const starChance = getLifeStarChance(state);
  const variantChance = getLifeVariantChance(state);
  const strainChance = 0.25;
  const roll = Math.random();

  if (roll < starChance) {
    return "star";
  }
  if (roll < starChance + variantChance) {
    return "variant";
  }
  if (roll < starChance + variantChance + strainChance) {
    return "strain";
  }
  return "evidence";
}

export function runLifeBreakthrough(
  state: GameState,
  pulls: number,
): LifeBreakthroughSummary | null {
  if (!canRunLifeBreakthrough(state, pulls)) {
    return null;
  }

  const summary: LifeBreakthroughSummary = {
    pulls,
    evidenceGained: 0,
    strainGained: 0,
    variantGained: 0,
    starChartsGained: 0,
    outcomeCounts: {
      evidence: 0,
      strain: 0,
      variant: 0,
      star: 0,
    },
    pityBefore: state.frontier.lifePity,
    pityAfter: state.frontier.lifePity,
  };

  spendCost(state, getLifeBreakthroughCost(pulls));
  const lowTierEvidenceBonus = getLifeLowTierEvidenceBonus(state);

  for (let index = 0; index < pulls; index += 1) {
    const outcome = resolveLifeOutcome(state);
    summary.outcomeCounts[outcome] += 1;

    if (outcome === "evidence") {
      summary.evidenceGained += addLifeEvidence(state, 3 + lowTierEvidenceBonus);
      state.frontier.lifePity += 1;
      continue;
    }

    if (outcome === "strain") {
      summary.strainGained += addResource(state, "res.frontier.life.strain_points", 6);
      if (lowTierEvidenceBonus > 0) {
        summary.evidenceGained += addLifeEvidence(state, lowTierEvidenceBonus);
      }
      state.frontier.lifePity += 1;
      continue;
    }

    if (outcome === "variant") {
      summary.variantGained += addResource(state, "res.frontier.life.variant_points", 1);
      state.frontier.lifePity = 0;
      continue;
    }

    summary.starChartsGained += 0.01;
    state.prestige.starCharts += 0.01;
    state.frontier.lifePity = 0;
    recalculatePrestigeBonuses(state);
  }

  summary.pityAfter = state.frontier.lifePity;
  clampAllResourcesToLimits(state);
  return summary;
}

export function canSpendEvidenceForPity(state: GameState): boolean {
  return (
    state.resources["res.frontier.evidence_points"] >= 20 &&
    state.frontier.lifePity < getLifePityThreshold(state) - 1
  );
}

export function spendEvidenceForPity(state: GameState): boolean {
  if (!canSpendEvidenceForPity(state)) {
    return false;
  }

  spendCost(state, { "res.frontier.evidence_points": 20 });
  state.frontier.lifePity = Math.min(
    getLifePityThreshold(state) - 1,
    state.frontier.lifePity + 5,
  );
  return true;
}

export function canExchangeEvidenceForVariant(state: GameState): boolean {
  return state.resources["res.frontier.evidence_points"] >= 45;
}

export function exchangeEvidenceForVariant(state: GameState): boolean {
  if (!canExchangeEvidenceForVariant(state)) {
    return false;
  }

  spendCost(state, { "res.frontier.evidence_points": 45 });
  addResource(state, "res.frontier.life.variant_points", 1);
  return true;
}

export function performAwakening(state: GameState): number {
  const preview = getAwakeningPreview(state);
  if (preview.lineageGain <= 0) {
    return 0;
  }

  const preservedDebugMultiplier = state.time.debugMultiplier;
  const preservedSystemMultiplier = state.time.systemMultiplier;
  const preservedAcademicLineage = state.prestige.academicLineage;
  const preservedStarCharts = state.prestige.starCharts;
  const nextState = createInitialState();

  Object.assign(state, nextState);
  state.prestige.cycle = preview.nextCycle;
  state.prestige.academicLineage = preservedAcademicLineage + preview.lineageGain;
  state.prestige.starCharts = preservedStarCharts;
  state.time.debugMultiplier = preservedDebugMultiplier;
  state.time.systemMultiplier = preservedSystemMultiplier;
  state.frontier.lifePity = 0;
  state.ui.activeTab = "campus";
  recalculatePrestigeBonuses(state);
  state.log = [
    formatAwakeningGainLog(preview.studyTraceGain, preview.lineageGain, preview.conversionRate),
    state.prestige.cycle === 2
      ? uiCopy.frontier.system.awakeningLogFirst
      : uiCopy.frontier.system.awakeningLogRepeat,
  ];
  state.lastTickAt = Date.now();
  return preview.lineageGain;
}
