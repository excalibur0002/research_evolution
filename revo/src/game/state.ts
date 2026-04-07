import { buildingDefinitions, type BuildingId } from "../data/buildings";
import {
  manualActionDefinitions,
  startingState,
  type ManualActionId,
} from "../data/game-config";
import { jobDefinitions, type JobId } from "../data/jobs";
import { resourceDefinitions, type ResourceId } from "../data/resources";
import { techDefinitions, type TechId } from "../data/techs";

export type ResourceState = Record<ResourceId, number>;
export type JobState = Record<JobId, number>;
export type BuildingState = Record<BuildingId, number>;
export type TechState = Record<TechId, boolean>;
export type BuildingActiveCountState = Record<BuildingId, number>;
export type BuildingConversionProgressState = Record<BuildingId, number>;
export type TabId = "campus" | "frontier";
export type ManualActionUnlockState = Record<ManualActionId, boolean>;
export type JobUnlockState = Record<JobId, boolean>;
export type BuildingUnlockState = Record<BuildingId, boolean>;
export type TechUnlockState = Record<TechId, boolean>;
export type ResourceUnlockState = Record<ResourceId, boolean>;

export type UnlockState = {
  resources: ResourceUnlockState;
  manualActions: ManualActionUnlockState;
  jobs: JobUnlockState;
  buildings: BuildingUnlockState;
  techs: TechUnlockState;
};

export type TimeState = {
  debugMultiplier: number;
  prestigeMultiplier: number;
  systemMultiplier: number;
};

export type PrestigeState = {
  cycle: number;
  academicLineage: number;
  starCharts: number;
  timeAccelerationBonus: number;
};

export type FrontierState = {
  lifePity: number;
};

export type UiState = {
  activeTab: TabId;
};

export type GameState = {
  resources: ResourceState;
  jobs: JobState;
  buildings: BuildingState;
  buildingActiveCount: BuildingActiveCountState;
  buildingConversionProgress: BuildingConversionProgressState;
  techs: TechState;
  unlocks: UnlockState;
  time: TimeState;
  prestige: PrestigeState;
  frontier: FrontierState;
  ui: UiState;
  log: string[];
  lastTickAt: number;
};

function createResourceState(): ResourceState {
  return Object.fromEntries(resourceDefinitions.map((resource) => [resource.id, 0])) as ResourceState;
}

function createJobState(): JobState {
  return Object.fromEntries(jobDefinitions.map((job) => [job.id, 0])) as JobState;
}

function createBuildingState(): BuildingState {
  return Object.fromEntries(
    buildingDefinitions.map((building) => [building.id, 0]),
  ) as BuildingState;
}

function createBuildingActiveCountState(buildings: BuildingState): BuildingActiveCountState {
  return Object.fromEntries(
    buildingDefinitions.map((building) => [building.id, Math.max(0, buildings[building.id] ?? 0)]),
  ) as BuildingActiveCountState;
}

function createBuildingConversionProgressState(): BuildingConversionProgressState {
  return Object.fromEntries(
    buildingDefinitions.map((building) => [building.id, 0]),
  ) as BuildingConversionProgressState;
}

function createTechState(): TechState {
  return Object.fromEntries(techDefinitions.map((tech) => [tech.id, false])) as TechState;
}

function createUnlockState(): UnlockState {
  return {
    resources: Object.fromEntries(
      resourceDefinitions.map((resource) => [resource.id, resource.visibleFromStart]),
    ) as ResourceUnlockState,
    manualActions: Object.fromEntries(
      manualActionDefinitions.map((action) => [action.id, action.unlockedFromStart]),
    ) as ManualActionUnlockState,
    jobs: Object.fromEntries(
      jobDefinitions.map((job) => [job.id, job.unlockedFromStart]),
    ) as JobUnlockState,
    buildings: Object.fromEntries(
      buildingDefinitions.map((building) => [building.id, building.unlockedFromStart]),
    ) as BuildingUnlockState,
    techs: Object.fromEntries(
      techDefinitions.map((tech) => [tech.id, tech.unlockedFromStart]),
    ) as TechUnlockState,
  };
}

export function createInitialState(): GameState {
  const initialBuildings: BuildingState = {
    ...createBuildingState(),
    ...startingState.buildings,
  };

  return {
    resources: {
      ...createResourceState(),
      ...startingState.resources,
    },
    jobs: {
      ...createJobState(),
      ...startingState.jobs,
    },
    buildings: initialBuildings,
    buildingActiveCount: {
      ...createBuildingActiveCountState(initialBuildings),
    },
    buildingConversionProgress: {
      ...createBuildingConversionProgressState(),
    },
    techs: {
      ...createTechState(),
      ...startingState.techs,
    },
    unlocks: createUnlockState(),
    time: {
      debugMultiplier: 1,
      prestigeMultiplier: 1,
      systemMultiplier: 1,
    },
    prestige: {
      cycle: 1,
      academicLineage: 0,
      starCharts: 0,
      timeAccelerationBonus: 1,
    },
    frontier: {
      lifePity: 0,
    },
    ui: {
      activeTab: "campus",
    },
    log: [
      "开学第一周，所有人都在找方向。",
      "总有人去开会，有人去赶工，也有人莫名其妙地留在了实验室。",
    ],
    lastTickAt: Date.now(),
  };
}
