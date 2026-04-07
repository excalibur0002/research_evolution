import "./style.css";

import {
  applyDebugMaxState,
  buyBuilding,
  acquireJob,
  gatherResource,
  researchTech,
  sendResearchGradToEmployment,
  sendStaffToFurtherStudy,
  sellBuilding,
  sellJob,
  decreaseBuildingActive,
  increaseBuildingActive,
} from "./game/actions";
import { buildingIds, type BuildingId } from "./data/buildings";
import { manualActionDefinitions } from "./data/game-config";
import { jobIds, type JobId } from "./data/jobs";
import { resourceNameById, type ResourceId } from "./data/resources";
import { techIds, type TechId } from "./data/techs";
import {
  exchangeEvidenceForVariant,
  performAwakening,
  runLifeBreakthrough,
  spendEvidenceForPity,
} from "./game/frontier";
import {
  isDevToolsUnlocked,
  setDevToolsUnlocked,
  verifyDevUnlockCode,
} from "./game/dev-tools";
import { advanceGame } from "./game/loop";
import { applyOfflineProgress, type OfflineReport } from "./game/offline";
import {
  exportSaveText,
  importSaveFromText,
  loadGameState,
  saveGameState,
} from "./game/persistence";
import {
  getEffectiveTimeScale,
  isDebugTimeScalePreset,
  setDebugTimeScale,
} from "./game/time";
import { refreshUnlockMemory } from "./game/formulas";
import { createInitialState } from "./game/state";
import {
  getUiUnlockFingerprint,
  refreshResourcePanel,
  renderApp,
  type ActionFeedbackModal,
} from "./ui/render";
import {
  applyUiTheme,
  getInitialUiTheme,
  isUiThemeId,
  type UiThemeId,
} from "./ui/theme";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element.");
}

const appRoot: HTMLDivElement = root;

const loadResult = loadGameState();
const state = loadResult.state;
let activeTheme: UiThemeId = getInitialUiTheme();
applyUiTheme(activeTheme);
let devToolsUnlocked = isDevToolsUnlocked();
let offlineReport: OfflineReport | null = applyOfflineProgress(state, loadResult.savedAt);
let showAwakeningConfirm = false;
let showHardResetConfirm = false;
let actionFeedbackModal: ActionFeedbackModal | null = null;
let floatingNotice: string | null = null;
let floatingNoticeTimer: number | null = null;
let uiFingerprint = "";
const AUTO_SAVE_INTERVAL_MS = 5000;
const UI_REFRESH_INTERVAL_MS = 120;
let lastAutoSaveAt = performance.now();
let lastUiRefreshAt = performance.now();

function persistGameState(): void {
  refreshUnlockMemory(state);
  saveGameState(state);
}

function renderFull(): void {
  refreshUnlockMemory(state);
  renderApp(
    appRoot,
    state,
    activeTheme,
    devToolsUnlocked,
    offlineReport,
    showAwakeningConfirm,
    showHardResetConfirm,
    floatingNotice,
    actionFeedbackModal,
  );
  uiFingerprint = getUiUnlockFingerprint(state);
}

const gatherableResourceIds = manualActionDefinitions.map(
  (action) => action.targetResourceId,
) as ReadonlyArray<ResourceId>;

const tabIds = ["campus", "frontier"] as const;

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

function isTabId(value: string | undefined): value is (typeof tabIds)[number] {
  return isOneOf(value, tabIds);
}

function parseTimeScale(value: string | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function parsePullCount(value: string | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || (parsed !== 1 && parsed !== 10)) {
    return null;
  }

  return parsed;
}

function triggerClickFeedback(button: HTMLButtonElement): void {
  button.classList.remove("btn-flash");
  void button.offsetWidth;
  button.classList.add("btn-flash");
  window.setTimeout(() => {
    button.classList.remove("btn-flash");
  }, 220);
}

function pushLocalLog(message: string): void {
  state.log.unshift(message);
  state.log = state.log.slice(0, 10);
}

function showFloatingNotice(message: string, durationMs = 1800): void {
  floatingNotice = message;
  if (floatingNoticeTimer !== null) {
    window.clearTimeout(floatingNoticeTimer);
  }
  floatingNoticeTimer = window.setTimeout(() => {
    floatingNotice = null;
    floatingNoticeTimer = null;
    renderFull();
  }, durationMs);
}

function showActionFeedback(
  title: string,
  message: string,
  confirmLabel = "知道了",
): void {
  actionFeedbackModal = { title, message, confirmLabel };
}

function spawnManualActionFloatingGain(target: HTMLElement, text: string): void {
  const rect = target.getBoundingClientRect();
  const marker = document.createElement("span");
  marker.className = "manual-action-gain";
  marker.textContent = text;
  marker.style.left = `${rect.left + rect.width / 2}px`;
  marker.style.top = `${rect.top - 4}px`;
  document.body.append(marker);
  window.setTimeout(() => {
    marker.remove();
  }, 700);
}

if (
  loadResult.migrationFromVersion !== null &&
  loadResult.migrationToVersion !== null
) {
  pushLocalLog(
    `检测到旧版存档 v${loadResult.migrationFromVersion}，已自动适配到 v${loadResult.migrationToVersion}，并保留了迁移前本地备份。`,
  );
}

function getSaveFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `research-evolution-save-${stamp}.revo`;
}

function getResetBackupFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `research-evolution-backup-before-reset-${stamp}.revo`;
}

function exportSaveToFile(filename = getSaveFilename(), suppressLog = false): string {
  const content = exportSaveText(state);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  if (!suppressLog) {
    pushLocalLog("已导出存档文件。");
  }
  return filename;
}

function triggerImportDialog(): void {
  const input = appRoot.querySelector<HTMLInputElement>("#save-file-input");
  if (!input) {
    return;
  }
  input.click();
}

function replaceCurrentState(nextState: typeof state): void {
  Object.assign(state, nextState);
  offlineReport = null;
  showAwakeningConfirm = false;
  showHardResetConfirm = false;
  actionFeedbackModal = null;
  floatingNotice = null;
  if (floatingNoticeTimer !== null) {
    window.clearTimeout(floatingNoticeTimer);
    floatingNoticeTimer = null;
  }
  previousTime = performance.now();
  lastAutoSaveAt = performance.now();
}

async function importSaveFromFile(file: File): Promise<void> {
  try {
    const rawText = await file.text();
    const hydrated = importSaveFromText(rawText);
    if (!hydrated) {
      showActionFeedback("导入失败", "文件不是有效的存档格式。", "知道了");
      renderFull();
      return;
    }

    replaceCurrentState(hydrated);
    pushLocalLog(`已导入存档：${file.name}`);
    showActionFeedback("导入成功", `已导入存档：${file.name}`, "继续");
    persistGameState();
    renderFull();
  } catch {
    showActionFeedback("导入失败", "无法读取存档文件。", "知道了");
    renderFull();
  }
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
  const wasDisabled = button.disabled;

  if (wasDisabled) {
    return;
  }

  if (action === "gather" && isGatherableResourceId(id)) {
    const gained = gatherResource(state, id);
    if (gained > 0) {
      spawnManualActionFloatingGain(
        button,
        `${resourceNameById[id]} +${formatSummaryNumber(gained)}`,
      );
    }
  } else if (action === "acquire-job" && isJobId(id)) {
    acquireJob(state, id);
  } else if (action === "sell-job" && isJobId(id)) {
    sellJob(state, id);
  } else if (action === "send-grad-to-employment") {
    sendResearchGradToEmployment(state);
  } else if (action === "send-staff-to-study") {
    sendStaffToFurtherStudy(state);
  } else if (action === "buy-building" && isBuildingId(id)) {
    buyBuilding(state, id);
  } else if (action === "sell-building" && isBuildingId(id)) {
    sellBuilding(state, id);
  } else if (action === "decrease-building-active" && isBuildingId(id)) {
    decreaseBuildingActive(state, id);
  } else if (action === "increase-building-active" && isBuildingId(id)) {
    increaseBuildingActive(state, id);
  } else if (action === "research-tech" && isTechId(id)) {
    researchTech(state, id);
  } else if (action === "switch-tab" && isTabId(id)) {
    state.ui.activeTab = id;
    renderFull();
    persistGameState();
    return;
  } else if (action === "life-breakthrough") {
    const pulls = parsePullCount(id);
    if (pulls === null) {
      return;
    }
    const summary = runLifeBreakthrough(state, pulls);
    if (!summary) {
      return;
    }
    const chunks: string[] = [];
    if (summary.evidenceGained > 0) {
      chunks.push(`旁证 +${formatSummaryNumber(summary.evidenceGained)}`);
    }
    if (summary.strainGained > 0) {
      chunks.push(`菌株 +${formatSummaryNumber(summary.strainGained)}`);
    }
    if (summary.variantGained > 0) {
      chunks.push(`变异株 +${formatSummaryNumber(summary.variantGained)}`);
    }
    if (summary.starChartsGained > 0) {
      chunks.push(`星图 +${formatSummaryNumber(summary.starChartsGained)}`);
    }
    const resultText = chunks.join(" / ") || "暂无有效产出";
    pushLocalLog(`破题会 x${pulls}：${resultText}。`);
    showFloatingNotice(`本次破题：${resultText}`);
  } else if (action === "life-evidence-pity") {
    if (!spendEvidenceForPity(state)) {
      return;
    }
    pushLocalLog("旁证补档完成，当前保底累计向前推进 5 格。");
  } else if (action === "life-evidence-variant") {
    if (!exchangeEvidenceForVariant(state)) {
      return;
    }
    pushLocalLog("旁证换株完成，获得 1 变异株。");
  } else if (action === "open-awakening-confirm") {
    showAwakeningConfirm = true;
    showHardResetConfirm = false;
    renderFull();
    return;
  } else if (action === "cancel-awakening") {
    showAwakeningConfirm = false;
    renderFull();
    return;
  } else if (action === "open-hard-reset-confirm") {
    showHardResetConfirm = true;
    showAwakeningConfirm = false;
    renderFull();
    return;
  } else if (action === "cancel-hard-reset") {
    showHardResetConfirm = false;
    renderFull();
    return;
  } else if (action === "confirm-hard-reset") {
    exportSaveToFile(getResetBackupFilename(), true);
    const freshState = createInitialState();
    replaceCurrentState(freshState);
    pushLocalLog("已重置全部进度，并自动导出重置前备份。");
    persistGameState();
    renderFull();
    return;
  } else if (action === "confirm-awakening") {
    const gained = performAwakening(state);
    if (gained <= 0) {
      return;
    }
    showAwakeningConfirm = false;
    offlineReport = null;
  } else if (action === "set-time-speed") {
    if (!devToolsUnlocked) {
      return;
    }
    const multiplier = parseTimeScale(id);
    if (multiplier !== null && isDebugTimeScalePreset(multiplier)) {
      setDebugTimeScale(state, multiplier);
    }
  } else if (action === "export-save") {
    const filename = exportSaveToFile();
    showActionFeedback("导出成功", `存档已导出：${filename}`, "继续");
  } else if (action === "import-save") {
    triggerImportDialog();
    return;
  } else if (action === "dismiss-action-feedback") {
    actionFeedbackModal = null;
    renderFull();
    return;
  } else if (action === "dismiss-offline-report") {
    offlineReport = null;
    renderFull();
    return;
  } else if (action === "debug-unlock-all") {
    if (!devToolsUnlocked) {
      return;
    }
    applyDebugMaxState(state);
    showAwakeningConfirm = false;
  } else {
    return;
  }

  persistGameState();
  renderFull();
  const flashedButton = appRoot.querySelector<HTMLButtonElement>(
    `button[data-action="${action}"]${id ? `[data-id="${id}"]` : ""}`,
  );
  if (flashedButton) {
    triggerClickFeedback(flashedButton);
  }
}

function formatSummaryNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}

document.addEventListener("click", handleClick);

function handleChange(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    if (target.dataset.action !== "set-theme") {
      return;
    }

    const nextTheme = target.value;
    if (!isUiThemeId(nextTheme)) {
      return;
    }

    activeTheme = nextTheme;
    applyUiTheme(activeTheme);
    renderFull();
    return;
  }

  if (target instanceof HTMLInputElement && target.dataset.action === "import-save-file") {
    const file = target.files?.[0];
    target.value = "";
    if (!file) {
      return;
    }
    void importSaveFromFile(file);
  }
}

document.addEventListener("change", handleChange);

async function tryUnlockDevTools(): Promise<void> {
  const input = window.prompt("输入测试码以启用测试模式");
  if (!input) {
    return;
  }

  const isValid = await verifyDevUnlockCode(input);
  if (!isValid) {
    window.alert("测试码错误。");
    return;
  }

  devToolsUnlocked = true;
  setDevToolsUnlocked(true);
  pushLocalLog("测试模式已启用。");
  renderFull();
}

function lockDevTools(): void {
  devToolsUnlocked = false;
  setDevToolsUnlocked(false);
  renderFull();
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!event.ctrlKey || !event.shiftKey) {
    return;
  }

  if (event.code === "KeyM") {
    event.preventDefault();
    if (devToolsUnlocked) {
      lockDevTools();
      return;
    }
    void tryUnlockDevTools();
  }
}

document.addEventListener("keydown", handleKeyDown);

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    persistGameState();
  }
}

document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("pagehide", persistGameState);
window.addEventListener("beforeunload", persistGameState);

let previousTime = performance.now();

function frame(now: number): void {
  const realDeltaSeconds = Math.min((now - previousTime) / 1000, 0.25);
  previousTime = now;
  const deltaSeconds = Math.min(realDeltaSeconds * getEffectiveTimeScale(state), 5);
  const hasNonResourceChanges = advanceGame(state, deltaSeconds);

  if (now - lastUiRefreshAt >= UI_REFRESH_INTERVAL_MS) {
    refreshUnlockMemory(state);
    const rebuiltResources = refreshResourcePanel(appRoot, state, devToolsUnlocked);
    const nextFingerprint = getUiUnlockFingerprint(state);
    if (rebuiltResources || hasNonResourceChanges || nextFingerprint !== uiFingerprint) {
      renderFull();
    }
    lastUiRefreshAt = now;
  }

  if (now - lastAutoSaveAt >= AUTO_SAVE_INTERVAL_MS) {
    persistGameState();
    lastAutoSaveAt = now;
  }
  window.requestAnimationFrame(frame);
}

renderFull();
persistGameState();
window.requestAnimationFrame(frame);
