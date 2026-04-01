import "./style.css";

import { buyBuilding, acquireJob, gatherResource, researchTech } from "./game/actions";
import { buildingIds, type BuildingId } from "./data/buildings";
import { manualActionDefinitions } from "./data/game-config";
import { jobIds, type JobId } from "./data/jobs";
import type { ResourceId } from "./data/resources";
import { techIds, type TechId } from "./data/techs";
import { advanceGame } from "./game/loop";
import { createInitialState } from "./game/state";
import { renderApp } from "./ui/render";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element.");
}

const appRoot: HTMLDivElement = root;

const state = createInitialState();

function render(): void {
  renderApp(appRoot, state);
}

const gatherableResourceIds = manualActionDefinitions.map(
  (action) => action.targetResourceId,
) as ReadonlyArray<ResourceId>;

function isOneOf<T extends string>(value: string | undefined, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isGatherableResourceId(
  value: string | undefined,
): value is (typeof gatherableResourceIds)[number] {
  return isOneOf(value, gatherableResourceIds);
}

function isBuildingId(value: string | undefined): value is BuildingId {
  return isOneOf(value, buildingIds);
}

function isTechId(value: string | undefined): value is TechId {
  return isOneOf(value, techIds);
}

function isJobId(value: string | undefined): value is JobId {
  return isOneOf(value, jobIds);
}

function handleClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "gather" && isGatherableResourceId(id)) {
    gatherResource(state, id);
  } else if (action === "acquire-job" && isJobId(id)) {
    acquireJob(state, id);
  } else if (action === "buy-building" && isBuildingId(id)) {
    buyBuilding(state, id);
  } else if (action === "research-tech" && isTechId(id)) {
    researchTech(state, id);
  }

  render();
}

document.addEventListener("click", handleClick);

let previousTime = performance.now();

function frame(now: number): void {
  const deltaSeconds = Math.min((now - previousTime) / 1000, 0.25);
  previousTime = now;
  advanceGame(state, deltaSeconds);
  render();
  window.requestAnimationFrame(frame);
}

render();
window.requestAnimationFrame(frame);
