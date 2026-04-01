import { buildingDefinitions, type BuildingId } from "../data/buildings";
import { startingState } from "../data/game-config";
import { jobDefinitions, type JobId } from "../data/jobs";
import { resourceDefinitions, type ResourceId } from "../data/resources";
import { techDefinitions, type TechId } from "../data/techs";

export type ResourceState = Record<ResourceId, number>;
export type JobState = Record<JobId, number>;
export type BuildingState = Record<BuildingId, number>;
export type TechState = Record<TechId, boolean>;

export type GameState = {
  resources: ResourceState;
  jobs: JobState;
  buildings: BuildingState;
  techs: TechState;
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

function createTechState(): TechState {
  return Object.fromEntries(techDefinitions.map((tech) => [tech.id, false])) as TechState;
}

export function createInitialState(): GameState {
  const state: GameState = {
    resources: {
      ...createResourceState(),
      ...startingState.resources,
    },
    jobs: {
      ...createJobState(),
      ...startingState.jobs,
    },
    buildings: {
      ...createBuildingState(),
      ...startingState.buildings,
    },
    techs: {
      ...createTechState(),
      ...startingState.techs,
    },
    log: [
      "研究计划启动。大学生资源正在持续流向工业与学术两侧。",
      "当前版本的数值来自统一配置表，后续平衡主要改配置即可。",
    ],
    lastTickAt: Date.now(),
  };

  return state;
}
