import { buildingIds } from "../data/buildings";
import { manualActionDefinitions } from "../data/game-config";
import { jobIds } from "../data/jobs";
import { resourceIds } from "../data/resources";
import { techIds } from "../data/techs";
import { recalculatePrestigeBonuses } from "./frontier";
import { createInitialState, type GameState, type TabId } from "./state";
import { refreshUnlockMemory } from "./formulas";
import { isDebugTimeScalePreset } from "./time";

const SAVE_STORAGE_KEY = "revo.save.v1";
const SAVE_VERSION = 5;
const SAVE_TEXT_PREFIX = "REVO_SAVE_V1";
const SAVE_CHECKSUM_SALT = "research-evolution-save";
const SAVE_MIGRATION_BACKUP_KEY = "revo.save.migration-backups.v1";
const SAVE_MIGRATION_BACKUP_LIMIT = 5;

type SaveEnvelope = {
  version: number;
  savedAt: number;
  state: unknown;
};

type SaveMigrationBackupReason =
  | "legacy-upgrade"
  | "version-upgrade"
  | "decode-failed"
  | "hydrate-failed";

type SaveMigrationBackupEntry = {
  createdAt: number;
  fromVersion: number | null;
  reason: SaveMigrationBackupReason;
  rawText: string;
};

type SaveMigrationResult = {
  state: unknown;
  fromVersion: number;
  toVersion: number;
  migrated: boolean;
};

export type LoadGameResult = {
  state: GameState;
  loaded: boolean;
  savedAt: number | null;
  migrationFromVersion: number | null;
  migrationToVersion: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  const normalized = toFiniteNumber(value, fallback);
  return Math.max(0, normalized);
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  return Math.floor(toNonNegativeNumber(value, fallback));
}

function toTabId(value: unknown, fallback: TabId): TabId {
  return value === "frontier" || value === "campus" ? value : fallback;
}

function readMigrationBackups(): SaveMigrationBackupEntry[] {
  try {
    const raw = window.localStorage.getItem(SAVE_MIGRATION_BACKUP_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry): entry is SaveMigrationBackupEntry =>
          isRecord(entry) &&
          typeof entry.createdAt === "number" &&
          Number.isFinite(entry.createdAt) &&
          (typeof entry.fromVersion === "number" ||
            entry.fromVersion === null) &&
          typeof entry.reason === "string" &&
          typeof entry.rawText === "string" &&
          entry.rawText.length > 0,
      )
      .slice(0, SAVE_MIGRATION_BACKUP_LIMIT);
  } catch {
    return [];
  }
}

function writeMigrationBackups(backups: SaveMigrationBackupEntry[]): void {
  try {
    window.localStorage.setItem(
      SAVE_MIGRATION_BACKUP_KEY,
      JSON.stringify(backups.slice(0, SAVE_MIGRATION_BACKUP_LIMIT)),
    );
  } catch {
    // Ignore storage errors to keep load path resilient.
  }
}

function appendMigrationBackup(
  rawText: string,
  reason: SaveMigrationBackupReason,
  fromVersion: number | null,
): void {
  if (!rawText.trim()) {
    return;
  }

  const current = readMigrationBackups();
  const next: SaveMigrationBackupEntry = {
    createdAt: Date.now(),
    fromVersion,
    reason,
    rawText,
  };
  writeMigrationBackups([next, ...current]);
}

function computeSaveChecksum(payload: string): string {
  const source = `${SAVE_CHECKSUM_SALT}|${payload}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function encodeOpaqueText(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeOpaqueText(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding =
      normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const binary = atob(normalized + padding);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function encodeSaveEnvelopeText(envelope: SaveEnvelope): string {
  const payload = encodeOpaqueText(JSON.stringify(envelope));
  const checksum = computeSaveChecksum(payload);
  return `${SAVE_TEXT_PREFIX}.${checksum}.${payload}`;
}

function decodeSaveEnvelopeText(rawText: string): unknown | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith(`${SAVE_TEXT_PREFIX}.`)) {
    return JSON.parse(trimmed) as unknown;
  }

  const parts = trimmed.split(".");
  if (parts.length < 3) {
    return null;
  }

  const checksum = parts[1];
  const payload = parts.slice(2).join(".");
  if (computeSaveChecksum(payload) !== checksum) {
    return null;
  }

  const decoded = decodeOpaqueText(payload);
  if (!decoded) {
    return null;
  }

  return JSON.parse(decoded) as unknown;
}

function hydrateState(rawState: unknown): GameState | null {
  if (!isRecord(rawState)) {
    return null;
  }

  const hydrated = createInitialState();

  const rawResources = isRecord(rawState.resources) ? rawState.resources : null;
  if (rawResources) {
    for (const resourceId of resourceIds) {
      hydrated.resources[resourceId] = toNonNegativeNumber(
        rawResources[resourceId],
        hydrated.resources[resourceId],
      );
    }
  }

  const rawJobs = isRecord(rawState.jobs) ? rawState.jobs : null;
  if (rawJobs) {
    for (const jobId of jobIds) {
      hydrated.jobs[jobId] = toNonNegativeInteger(rawJobs[jobId], hydrated.jobs[jobId]);
    }
  }

  const rawBuildings = isRecord(rawState.buildings) ? rawState.buildings : null;
  if (rawBuildings) {
    for (const buildingId of buildingIds) {
      hydrated.buildings[buildingId] = toNonNegativeInteger(
        rawBuildings[buildingId],
        hydrated.buildings[buildingId],
      );
    }
  }

  const rawActiveCounts = isRecord(rawState.buildingActiveCount)
    ? rawState.buildingActiveCount
    : null;
  const rawLegacyEnabled = isRecord(rawState.buildingEnabled)
    ? rawState.buildingEnabled
    : null;

  for (const buildingId of buildingIds) {
    const ownedCount = Math.max(0, hydrated.buildings[buildingId]);

    if (rawActiveCounts) {
      hydrated.buildingActiveCount[buildingId] = Math.min(
        toNonNegativeInteger(rawActiveCounts[buildingId], ownedCount),
        ownedCount,
      );
      continue;
    }

    if (rawLegacyEnabled) {
      const legacyEnabled = rawLegacyEnabled[buildingId];
      hydrated.buildingActiveCount[buildingId] = legacyEnabled === false ? 0 : ownedCount;
      continue;
    }

    hydrated.buildingActiveCount[buildingId] = ownedCount;
  }

  const rawProgress = isRecord(rawState.buildingConversionProgress)
    ? rawState.buildingConversionProgress
    : null;
  if (rawProgress) {
    for (const buildingId of buildingIds) {
      const loadedProgress = toNonNegativeNumber(
        rawProgress[buildingId],
        hydrated.buildingConversionProgress[buildingId],
      );
      // Compatibility fix: older saves may accumulate very large pending cycles when
      // inputs are missing. Clamp to one pending cycle to avoid starvation loops.
      hydrated.buildingConversionProgress[buildingId] = Math.min(loadedProgress, 1);
    }
  }

  const rawTechs = isRecord(rawState.techs) ? rawState.techs : null;
  if (rawTechs) {
    for (const techId of techIds) {
      hydrated.techs[techId] = rawTechs[techId] === true;
    }
  }

  const rawUnlocks = isRecord(rawState.unlocks) ? rawState.unlocks : null;
  if (rawUnlocks) {
    const rawResourcesUnlocked = isRecord(rawUnlocks.resources) ? rawUnlocks.resources : null;
    if (rawResourcesUnlocked) {
      for (const resourceId of resourceIds) {
        hydrated.unlocks.resources[resourceId] = rawResourcesUnlocked[resourceId] === true;
      }
    }

    const rawManualActions = isRecord(rawUnlocks.manualActions) ? rawUnlocks.manualActions : null;
    if (rawManualActions) {
      for (const action of manualActionDefinitions) {
        hydrated.unlocks.manualActions[action.id] = rawManualActions[action.id] === true;
      }
    }

    const rawJobsUnlocked = isRecord(rawUnlocks.jobs) ? rawUnlocks.jobs : null;
    if (rawJobsUnlocked) {
      for (const jobId of jobIds) {
        hydrated.unlocks.jobs[jobId] = rawJobsUnlocked[jobId] === true;
      }
    }

    const rawBuildingsUnlocked = isRecord(rawUnlocks.buildings) ? rawUnlocks.buildings : null;
    if (rawBuildingsUnlocked) {
      for (const buildingId of buildingIds) {
        hydrated.unlocks.buildings[buildingId] = rawBuildingsUnlocked[buildingId] === true;
      }
    }

    const rawTechsUnlocked = isRecord(rawUnlocks.techs) ? rawUnlocks.techs : null;
    if (rawTechsUnlocked) {
      for (const techId of techIds) {
        hydrated.unlocks.techs[techId] = rawTechsUnlocked[techId] === true;
      }
    }
  }

  const rawTime = isRecord(rawState.time) ? rawState.time : null;
  if (rawTime) {
    const debugMultiplier = toFiniteNumber(rawTime.debugMultiplier, 1);
    hydrated.time.debugMultiplier = isDebugTimeScalePreset(debugMultiplier)
      ? debugMultiplier
      : 1;
    hydrated.time.systemMultiplier = Math.max(
      0.01,
      toFiniteNumber(rawTime.systemMultiplier, hydrated.time.systemMultiplier),
    );
  }

  const rawPrestige = isRecord(rawState.prestige) ? rawState.prestige : null;
  if (rawPrestige) {
    hydrated.prestige.cycle = Math.max(
      1,
      toNonNegativeInteger(rawPrestige.cycle, hydrated.prestige.cycle),
    );
    hydrated.prestige.academicLineage = toNonNegativeNumber(
      rawPrestige.academicLineage ?? rawPrestige.legacyPoints,
      hydrated.prestige.academicLineage,
    );
    hydrated.prestige.starCharts = toNonNegativeNumber(
      rawPrestige.starCharts,
      hydrated.prestige.starCharts,
    );
  }

  const rawFrontier = isRecord(rawState.frontier) ? rawState.frontier : null;
  if (rawFrontier) {
    hydrated.frontier.lifePity = toNonNegativeInteger(
      rawFrontier.lifePity,
      hydrated.frontier.lifePity,
    );
  }

  const rawUi = isRecord(rawState.ui) ? rawState.ui : null;
  if (rawUi) {
    hydrated.ui.activeTab = toTabId(rawUi.activeTab, hydrated.ui.activeTab);
  }

  if (Array.isArray(rawState.log)) {
    const filteredLogs = rawState.log
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .slice(0, 10);
    if (filteredLogs.length > 0) {
      hydrated.log = filteredLogs;
    }
  }

  refreshUnlockMemory(hydrated);
  recalculatePrestigeBonuses(hydrated);
  hydrated.lastTickAt = Date.now();
  return hydrated;
}

function isSaveEnvelope(value: unknown): value is SaveEnvelope {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    Number.isFinite(value.version) &&
    "state" in value
  );
}

function getSaveVersion(parsed: unknown): number {
  if (!isSaveEnvelope(parsed)) {
    return 0;
  }
  return toNonNegativeInteger(parsed.version, 0);
}

function runStateMigrationToVersion(
  state: unknown,
  fromVersion: number,
): SaveMigrationResult {
  let workingState = state;
  let version = Math.max(0, fromVersion);

  // Migration chain placeholder: add concrete migration handlers here when
  // schema changes require explicit transforms before hydrate.
  while (version < SAVE_VERSION) {
    version += 1;
  }

  return {
    state: workingState,
    fromVersion: Math.max(0, fromVersion),
    toVersion: version,
    migrated: version > Math.max(0, fromVersion),
  };
}

function createSaveEnvelope(state: GameState): SaveEnvelope {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
  };
}

function extractHydratableState(value: unknown): unknown {
  return isSaveEnvelope(value) ? value.state : value;
}

export function loadGameState(): LoadGameResult {
  const fallbackState = createInitialState();
  const fallbackResult: LoadGameResult = {
    state: fallbackState,
    loaded: false,
    savedAt: null,
    migrationFromVersion: null,
    migrationToVersion: null,
  };

  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      recalculatePrestigeBonuses(fallbackState);
      return fallbackResult;
    }

    const parsed = decodeSaveEnvelopeText(raw);
    if (!parsed) {
      appendMigrationBackup(raw, "decode-failed", null);
      recalculatePrestigeBonuses(fallbackState);
      return fallbackResult;
    }

    const sourceVersion = getSaveVersion(parsed);
    const migration = runStateMigrationToVersion(
      extractHydratableState(parsed),
      sourceVersion,
    );
    const upgradeReason: SaveMigrationBackupReason =
      sourceVersion === 0 ? "legacy-upgrade" : "version-upgrade";
    if (migration.migrated) {
      appendMigrationBackup(raw, upgradeReason, sourceVersion);
    }

    const hydrated = hydrateState(migration.state);
    if (!hydrated) {
      appendMigrationBackup(raw, "hydrate-failed", sourceVersion);
      recalculatePrestigeBonuses(fallbackState);
      return fallbackResult;
    }

    if (migration.migrated) {
      saveGameState(hydrated);
    }

    const savedAt = isSaveEnvelope(parsed)
      ? toFiniteNumber(parsed.savedAt, Date.now())
      : null;
    return {
      state: hydrated,
      loaded: true,
      savedAt,
      migrationFromVersion: migration.migrated ? migration.fromVersion : null,
      migrationToVersion: migration.migrated ? migration.toVersion : null,
    };
  } catch {
    recalculatePrestigeBonuses(fallbackState);
    return fallbackResult;
  }
}

export function exportSaveText(state: GameState): string {
  return encodeSaveEnvelopeText(createSaveEnvelope(state));
}

export function importSaveFromText(rawText: string): GameState | null {
  try {
    const parsed = decodeSaveEnvelopeText(rawText);
    if (!parsed) {
      return null;
    }
    const migration = runStateMigrationToVersion(
      extractHydratableState(parsed),
      getSaveVersion(parsed),
    );
    return hydrateState(migration.state);
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  const payload = exportSaveText(state);

  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, payload);
  } catch {
    // Ignore storage full / blocked cases. Game can still run without persistence.
  }
}

export const exportSaveAsJson = exportSaveText;
export const importSaveFromJson = importSaveFromText;
