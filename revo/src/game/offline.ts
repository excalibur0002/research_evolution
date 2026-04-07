import { offlineProgressConfig } from "../data/game-config";
import { jobDefinitions } from "../data/jobs";
import { resourceDefinitions, type ResourceId } from "../data/resources";
import { advanceGame } from "./loop";
import type { GameState } from "./state";

const OFFLINE_EPSILON = 1e-6;

type OfflineGainItem = {
  id: string;
  name: string;
  amount: number;
};

export type OfflineReport = {
  awaySeconds: number;
  simulatedSeconds: number;
  resourceGains: OfflineGainItem[];
  jobGains: OfflineGainItem[];
};

function snapshotResources(state: GameState): Record<ResourceId, number> {
  const snapshot = {} as Record<ResourceId, number>;
  for (const resource of resourceDefinitions) {
    snapshot[resource.id] = state.resources[resource.id];
  }
  return snapshot;
}

function buildResourceGains(
  before: Record<ResourceId, number>,
  state: GameState,
): OfflineGainItem[] {
  return resourceDefinitions
    .map((resource) => {
      const amount = state.resources[resource.id] - before[resource.id];
      return {
        id: resource.id,
        name: resource.name,
        amount,
      };
    })
    .filter((entry) => entry.amount > OFFLINE_EPSILON)
    .sort((a, b) => b.amount - a.amount);
}

function buildJobGains(before: Record<string, number>, state: GameState): OfflineGainItem[] {
  return jobDefinitions
    .map((job) => {
      const amount = state.jobs[job.id] - (before[job.id] ?? 0);
      return {
        id: job.id,
        name: job.name,
        amount,
      };
    })
    .filter((entry) => entry.amount > OFFLINE_EPSILON)
    .sort((a, b) => b.amount - a.amount);
}

export function applyOfflineProgress(
  state: GameState,
  savedAt: number | null,
): OfflineReport | null {
  if (!offlineProgressConfig.enabled || typeof savedAt !== "number") {
    return null;
  }

  const now = Date.now();
  const rawAwaySeconds = Math.max(0, (now - savedAt) / 1000);
  if (rawAwaySeconds <= 1) {
    return null;
  }

  const cappedAwaySeconds = Math.min(rawAwaySeconds, offlineProgressConfig.maxAwaySeconds);
  const offlineScale =
    offlineProgressConfig.rate *
    Math.max(0.01, state.time.prestigeMultiplier) *
    Math.max(0.01, state.time.systemMultiplier);
  const simulatedSeconds = cappedAwaySeconds * offlineScale;

  if (simulatedSeconds <= OFFLINE_EPSILON) {
    return null;
  }

  const resourceBefore = snapshotResources(state);
  const jobBefore = { ...state.jobs };
  advanceGame(state, simulatedSeconds);
  state.lastTickAt = now;

  const resourceGains = buildResourceGains(resourceBefore, state);
  const jobGains = buildJobGains(jobBefore, state);
  const shouldShowReport =
    rawAwaySeconds >= offlineProgressConfig.minAwaySecondsForReport &&
    (resourceGains.length > 0 || jobGains.length > 0);

  if (!shouldShowReport) {
    return null;
  }

  return {
    awaySeconds: rawAwaySeconds,
    simulatedSeconds,
    resourceGains,
    jobGains,
  };
}
