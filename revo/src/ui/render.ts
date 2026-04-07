import { buildingDefinitions } from "../data/buildings";
import { manualActionDefinitions } from "../data/game-config";
import { jobDefinitions, jobNameById } from "../data/jobs";
import { resourceDefinitions, resourceNameById, type ResourceId } from "../data/resources";
import { techDefinitions } from "../data/techs";
import { formatLifePityNote, uiCopy, type ModeCopy } from "../data/ui-copy";
import {
  canAfford,
  canAffordJobs,
  getActiveBuildingCount,
  getHeadcountLimit,
  getHeadcountUsed,
  getProductionPerSecond,
  getResourceLimit,
  getUnlockedFlags,
  hasHeadcountForJob,
  isBuildingUnlocked,
  isJobUnlocked,
  isManualActionUnlocked,
  isTechUnlocked,
  getNextBuildingResourceCost,
} from "../game/formulas";
import {
  canAwaken,
  canExchangeEvidenceForVariant,
  canRunLifeBreakthrough,
  canSpendEvidenceForPity,
  getAwakeningPreview,
  getLifeBreakthroughCost,
  getLifeDropTable,
  getLifePityThreshold,
  isFrontierBuildingId,
  isFrontierTechId,
  isLifeModuleUnlocked,
  isParallelLifeBreakthroughUnlocked,
} from "../game/frontier";
import type { OfflineReport } from "../game/offline";
import type { GameState, TabId } from "../game/state";
import { debugTimeScalePresets, getEffectiveTimeScale } from "../game/time";
import { formatNumber } from "../utils/format";
import { uiThemeOptions, type UiThemeId } from "./theme";

type ResourceRowKey =
  | ResourceId
  | "meta.headcount"
  | "meta.lineage"
  | "meta.starCharts";

export type ActionFeedbackModal = {
  title: string;
  message: string;
  confirmLabel: string;
};

const resourceProducerBuildingNamesById: Partial<Record<ResourceId, string[]>> = (() => {
  const map: Partial<Record<ResourceId, string[]>> = {};

  buildingDefinitions.forEach((building) => {
    const producerResourceIds = new Set<ResourceId>();
    Object.keys(building.producesPerSecond ?? {}).forEach((resourceId) => {
      producerResourceIds.add(resourceId as ResourceId);
    });
    Object.keys(building.conversion?.outputResources ?? {}).forEach((resourceId) => {
      producerResourceIds.add(resourceId as ResourceId);
    });

    producerResourceIds.forEach((resourceId) => {
      const current = map[resourceId] ?? [];
      if (!current.includes(building.name)) {
        current.push(building.name);
      }
      map[resourceId] = current;
    });
  });

  return map;
})();

function getModeCopy(copy: ModeCopy, showDevText: boolean): string {
  return showDevText ? copy.dev : copy.player;
}

function getResourceProducerHint(resourceId: ResourceId): string {
  const producerNames = resourceProducerBuildingNamesById[resourceId] ?? [];
  if (producerNames.length === 0) {
    return "";
  }
  return `相关设施产出：${producerNames.join("、")}。`;
}

function formatResourceCostText(
  cost: Partial<Record<ResourceId, number>> | undefined,
): string {
  if (!cost) {
    return "";
  }

  return Object.entries(cost)
    .map(
      ([resourceId, amount]) =>
        `${resourceNameById[resourceId as ResourceId]} ${amount}`,
    )
    .join(" / ");
}

function formatJobCostText(cost: Partial<Record<keyof typeof jobNameById, number>> | undefined): string {
  if (!cost) {
    return "";
  }

  return Object.entries(cost)
    .map(([jobId, amount]) => `${jobNameById[jobId as keyof typeof jobNameById]} ${amount}`)
    .join(" / ");
}

function formatCombinedCostText(
  resourceCost: Partial<Record<ResourceId, number>> | undefined,
  jobCost: Partial<Record<keyof typeof jobNameById, number>> | undefined,
): string {
  const chunks = [formatResourceCostText(resourceCost), formatJobCostText(jobCost)].filter(Boolean);
  return chunks.join(" / ");
}

function formatPercent(value: number): string {
  const percent = value * 100;
  return `${percent < 1 ? percent.toFixed(2) : percent.toFixed(1)}%`;
}

function renderDevMeta(showDevText: boolean, text: string): string {
  if (!showDevText) {
    return "";
  }
  return `<div class="row-meta row-meta--dev">${text}</div>`;
}

const SOFT_GUARD_RESOURCE_IDS: ResourceId[] = [
  "res.core.undergraduates",
  "res.core.topic_points",
  "res.core.project_points",
];

function createProjectedStateForActiveCount(
  state: GameState,
  buildingId: (typeof buildingDefinitions)[number]["id"],
  nextActiveCount: number,
): GameState {
  return {
    ...state,
    buildingActiveCount: {
      ...state.buildingActiveCount,
      [buildingId]: Math.max(0, nextActiveCount),
    },
  };
}

function getSoftGuardResourcesForBuilding(
  building: (typeof buildingDefinitions)[number],
): ResourceId[] {
  return Object.keys(building.conversion?.inputResources ?? {}).filter((resourceId) =>
    SOFT_GUARD_RESOURCE_IDS.includes(resourceId as ResourceId),
  ) as ResourceId[];
}

function getNegativeSoftGuardResourcesForActiveCount(
  state: GameState,
  building: (typeof buildingDefinitions)[number],
  nextActiveCount: number,
): ResourceId[] {
  const guardedResourceIds = getSoftGuardResourcesForBuilding(building);
  if (guardedResourceIds.length === 0) {
    return [];
  }

  const projectedState = createProjectedStateForActiveCount(state, building.id, nextActiveCount);
  return guardedResourceIds.filter(
    (resourceId) => getProductionPerSecond(projectedState, resourceId) < -0.000001,
  );
}

function formatGuardResourceNames(resourceIds: ResourceId[]): string {
  return resourceIds.map((resourceId) => resourceNameById[resourceId]).join("、");
}

function getBuildingSoftGuardState(
  state: GameState,
  building: (typeof buildingDefinitions)[number],
): {
  notice: string;
  warnOnIncrease: boolean;
} {
  if (!building.toggleable || !building.conversion) {
    return {
      notice: "",
      warnOnIncrease: false,
    };
  }

  const guardedResourceIds = getSoftGuardResourcesForBuilding(building);
  if (guardedResourceIds.length === 0) {
    return {
      notice: "",
      warnOnIncrease: false,
    };
  }

  const ownedCount = state.buildings[building.id];
  const activeCount = getActiveBuildingCount(state, building.id);
  const currentNegative = getNegativeSoftGuardResourcesForActiveCount(state, building, activeCount);

  if (activeCount < ownedCount) {
    const nextNegative = getNegativeSoftGuardResourcesForActiveCount(state, building, activeCount + 1);
    const newlyNegative = nextNegative.filter((resourceId) => !currentNegative.includes(resourceId));
    if (newlyNegative.length > 0) {
      return {
        notice: `提醒: 再开 1 个会让${formatGuardResourceNames(newlyNegative)}转为负增长。`,
        warnOnIncrease: true,
      };
    }

    if (currentNegative.length > 0) {
      return {
        notice: `提醒: 当前这条线已经压着${formatGuardResourceNames(currentNegative)}，可以先减档。`,
        warnOnIncrease: true,
      };
    }
  }

  if (currentNegative.length > 0 && activeCount > 0) {
    return {
      notice: `提醒: 当前这条线已经压着${formatGuardResourceNames(currentNegative)}，可以先减档。`,
      warnOnIncrease: false,
    };
  }

  return {
    notice: "",
    warnOnIncrease: false,
  };
}

function getVisibleResourceRowKeys(state: GameState): ResourceRowKey[] {
  const resourceKeys = resourceDefinitions
    .filter(
      (resource) =>
        state.unlocks.resources[resource.id] ||
        resource.visibleFromStart ||
        state.resources[resource.id] > 0,
    )
    .map((resource) => resource.id);

  const metaKeys: ResourceRowKey[] = ["meta.headcount"];
  if (
    state.prestige.cycle > 1 ||
    state.prestige.academicLineage > 0 ||
    state.prestige.starCharts > 0
  ) {
    metaKeys.push("meta.lineage", "meta.starCharts");
  }

  return [...resourceKeys, ...metaKeys];
}

function renderResourceRows(state: GameState, showDevText: boolean): string {
  return getVisibleResourceRowKeys(state)
    .map((rowKey) => renderResourceRowByKey(state, rowKey, showDevText))
    .join("");
}

function renderResourceRowByKey(
  state: GameState,
  rowKey: ResourceRowKey,
  showDevText: boolean,
): string {
  if (rowKey === "meta.headcount") {
    const used = getHeadcountUsed(state);
    const limit = getHeadcountLimit(state);
    return `
      <div class="resource-row compact-resource" data-resource-id="${rowKey}" title="${showDevText ? "编制决定可留在当前体系中的职员与研究生总量。" : "能留下来的人，总得有地方安放。"}">
        <div class="row-title">编制</div>
        <div class="row-metric">
          <strong data-field="value">${used}/${limit}</strong>
          <span data-field="rate">${showDevText ? "职员 + 研究生" : ""}</span>
        </div>
      </div>
    `;
  }

  if (rowKey === "meta.lineage") {
    return `
      <div class="resource-row compact-resource" data-resource-id="${rowKey}" title="${getModeCopy(uiCopy.frontier.summary.lineageTooltip, showDevText)}">
        <div class="row-title">${uiCopy.frontier.summary.lineageLabel}</div>
        <div class="row-metric">
          <strong data-field="value">${formatNumber(state.prestige.academicLineage)}</strong>
          <span data-field="rate"></span>
        </div>
      </div>
    `;
  }

  if (rowKey === "meta.starCharts") {
    return `
      <div class="resource-row compact-resource" data-resource-id="${rowKey}" title="${getModeCopy(uiCopy.frontier.summary.starTooltip, showDevText)}">
        <div class="row-title">星图</div>
        <div class="row-metric">
          <strong data-field="value">${formatNumber(state.prestige.starCharts)}</strong>
          <span data-field="rate"></span>
        </div>
      </div>
    `;
  }

  const resource = resourceDefinitions.find((entry) => entry.id === rowKey);
  if (!resource) {
    return "";
  }

  const perSecond = getProductionPerSecond(state, resource.id);
  const amount = state.resources[resource.id];
  const limit = getResourceLimit(state, resource.id);
  const producerHint = getResourceProducerHint(resource.id);
  const titleText = producerHint
    ? `${resource.description} ${producerHint}`
    : resource.description;

  return `
    <div class="resource-row compact-resource" data-resource-id="${resource.id}" title="${titleText}">
      <div class="row-title">${resource.name}</div>
      <div class="row-metric">
        <strong data-field="value">${formatNumber(amount)}/${formatNumber(limit)}</strong>
        <span data-field="rate">${perSecond >= 0 ? "+" : ""}${formatNumber(perSecond)}/秒</span>
      </div>
    </div>
  `;
}

function renderJobRows(state: GameState, showDevText: boolean): string {
  return jobDefinitions
    .filter((job) => isJobUnlocked(state, job.id))
    .map((job) => {
      const produces = Object.entries(job.producesPerSecond)
        .map(
          ([resourceId, amount]) =>
            `${resourceNameById[resourceId as ResourceId]} +${amount}/秒`,
        )
        .join(" / ");
      const costText = Object.entries(job.cost ?? {})
        .map(
          ([resourceId, amount]) =>
            `${resourceNameById[resourceId as ResourceId]} ${amount}`,
        )
        .join(" / ");
      const canAcquire = canAfford(state, job.cost);
      const hasHeadcount = hasHeadcountForJob(state, job.id);
      const sellable = state.jobs[job.id] > 0;
      const canEmploymentRoute =
        job.id === "job.acad.research_grad" &&
        state.techs["tech.cross.reemployment_channel"];
      const employmentRouteEnabled =
        canEmploymentRoute && state.jobs["job.acad.research_grad"] >= 2;
      const canStudyRoute =
        job.id === "job.ops.staff" &&
        state.techs["tech.cross.inservice_upskill_channel"];
      const studyRouteEnabled = canStudyRoute && state.jobs["job.ops.staff"] >= 2;
      const action = `
        <div class="action-pair">
          <button
            data-action="acquire-job"
            data-id="${job.id}"
            title="大学生转化为${job.name}"
            ${(canAcquire && hasHeadcount) ? "" : "disabled"}
          >${job.actionLabel}</button>
          ${canEmploymentRoute ? `<button data-action="send-grad-to-employment" title="2研究生转为1职员，不返还培养资源" ${employmentRouteEnabled ? "" : "disabled"}>就业</button>` : ""}
          ${canStudyRoute ? `<button data-action="send-staff-to-study" title="2职员转为1研究生，不返还培养资源" ${studyRouteEnabled ? "" : "disabled"}>进修</button>` : ""}
          <button
            data-action="sell-job"
            data-id="${job.id}"
            title="释放当前${job.name}，不返还培养资源"
            ${sellable ? "" : "disabled"}
          >${job.releaseLabel}</button>
        </div>
      `;

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${job.name} <span class="count-tag">x${state.jobs[job.id]}</span></div>
            <div class="row-meta">${job.description}</div>
            <div class="row-meta">需要: ${costText || "无"}</div>
            ${renderDevMeta(showDevText, produces || "当前不产出资源")}
            ${canEmploymentRoute ? renderDevMeta(showDevText, "分流路线: 2研究生 -> 1职员") : ""}
            ${canStudyRoute ? renderDevMeta(showDevText, "回流路线: 2职员 -> 1研究生") : ""}
          </div>
          <div class="row-action">${action}</div>
        </div>
      `;
    })
    .join("");
}

function renderBuildingRows(
  state: GameState,
  filterFn: (building: (typeof buildingDefinitions)[number]) => boolean,
  showDevText: boolean,
): string {
  return buildingDefinitions
    .filter((building) => filterFn(building))
    .filter((building) => isBuildingUnlocked(state, building.id))
    .map((building) => {
      const nextCost = getNextBuildingResourceCost(state, building.id);
      const costText = formatCombinedCostText(nextCost, building.jobCost);
      const canBuy = canAfford(state, nextCost) && canAffordJobs(state, building.jobCost);
      const sellable = state.buildings[building.id] > 0;
      const ownedCount = state.buildings[building.id];
      const activeCount = getActiveBuildingCount(state, building.id);
      const canDecrease = building.toggleable && activeCount > 0;
      const canIncrease = building.toggleable && activeCount < ownedCount;
      const softGuard = getBuildingSoftGuardState(state, building);
      const statusText = building.toggleable
        ? `运行 ${activeCount}/${ownedCount}`
        : `数量 ${ownedCount}`;
      const activeControl = building.toggleable
        ? `
            <div class="runtime-stepper" title="${softGuard.notice || "调整运行中的设施数量"}" ${softGuard.warnOnIncrease ? 'data-state="warning"' : ""}>
              <button data-action="decrease-building-active" data-id="${building.id}" title="暂时关闭" ${canDecrease ? "" : "disabled"}>-</button>
              <span class="runtime-readout">${activeCount}/${ownedCount}</span>
              <button data-action="increase-building-active" data-id="${building.id}" ${softGuard.warnOnIncrease ? 'data-state="warning"' : ""} title="暂时开启" ${canIncrease ? "" : "disabled"}>+</button>
            </div>
          `
        : `<div class="runtime-stepper runtime-stepper--placeholder" aria-hidden="true"><span class="runtime-readout">0/0</span></div>`;

      return `
        <div class="list-row building-row">
          <div class="building-main" title="${building.description}">
            <div class="row-title">${building.name} <span class="count-tag">x${state.buildings[building.id]}</span></div>
            <div class="row-meta">作用: ${building.effectText}</div>
            <div class="row-meta">建造成本: ${costText}${showDevText ? ` | 状态: ${statusText}` : ""}</div>
            ${softGuard.notice ? `<div class="row-meta row-meta--warning">${softGuard.notice}</div>` : ""}
            ${renderDevMeta(showDevText, `说明: ${building.description}`)}
          </div>
          <div class="row-action building-actions">
            <div class="building-action-grid">
              <div class="building-action-line">
                <button data-action="buy-building" data-id="${building.id}" ${canBuy ? "" : "disabled"}>建造</button>
                <button data-action="sell-building" data-id="${building.id}" title="返回一半资源" ${sellable ? "" : "disabled"}>出售</button>
              </div>
              <div class="building-action-line">
                ${activeControl}
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function hasExclusiveTechConflict(
  state: GameState,
  techId: (typeof techDefinitions)[number]["id"],
): boolean {
  const tech = techDefinitions.find((entry) => entry.id === techId);
  if (!tech?.exclusiveGroup) {
    return false;
  }

  return techDefinitions.some((otherTech) => {
    return (
      otherTech.id !== tech.id &&
      otherTech.exclusiveGroup === tech.exclusiveGroup &&
      state.techs[otherTech.id]
    );
  });
}

function renderTechRows(
  state: GameState,
  filterFn: (tech: (typeof techDefinitions)[number]) => boolean,
  showDevText: boolean,
): string {
  return techDefinitions
    .filter((tech) => filterFn(tech))
    .filter((tech) => isTechUnlocked(state, tech.id))
    .map((tech) => {
      const costText = formatCombinedCostText(tech.cost, tech.jobCost);
      const hasConflict = hasExclusiveTechConflict(state, tech.id);
      const status = state.techs[tech.id] ? "完成" : "待研";
      const affordable = canAfford(state, tech.cost) && canAffordJobs(state, tech.jobCost);
      const actionLabel = state.techs[tech.id] ? "完成" : "研究";
      const actionAttrs = state.techs[tech.id]
        ? "disabled"
        : affordable && !hasConflict
          ? ""
          : "disabled";

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${tech.name} <span class="count-tag">${status}</span></div>
            <div class="row-meta">${tech.description}</div>
            <div class="row-meta">作用: ${tech.effectText}</div>
            <div class="row-meta">成本: ${costText}</div>
            ${hasConflict ? renderDevMeta(showDevText, "当前分支与已选制度互斥。") : ""}
          </div>
          <div class="row-action">
            <button data-action="research-tech" data-id="${tech.id}" ${actionAttrs}>${actionLabel}</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderLogRows(state: GameState): string {
  return state.log.map((message) => `<li>${message}</li>`).join("");
}

function renderTimeControls(state: GameState): string {
  return debugTimeScalePresets
    .map((multiplier) => {
      const isActive = state.time.debugMultiplier === multiplier;
      return `
        <button
          data-action="set-time-speed"
          data-id="${multiplier}"
          ${isActive ? 'data-state="active"' : ""}
        >
          x${multiplier}
        </button>
      `;
    })
    .join("");
}

function renderThemeOptions(activeTheme: UiThemeId): string {
  return uiThemeOptions
    .map((theme) => {
      const selected = theme.id === activeTheme ? "selected" : "";
      return `<option value="${theme.id}" ${selected}>${theme.label}</option>`;
    })
    .join("");
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainSeconds = total % 60;
  const chunks: string[] = [];
  if (hours > 0) {
    chunks.push(`${hours}小时`);
  }
  if (minutes > 0 || hours > 0) {
    chunks.push(`${minutes}分`);
  }
  chunks.push(`${remainSeconds}秒`);
  return chunks.join("");
}

function renderOfflineReport(offlineReport: OfflineReport): string {
  const resourceRows = offlineReport.resourceGains
    .slice(0, 8)
    .map((entry) => `<li>${entry.name} +${formatNumber(entry.amount)}</li>`)
    .join("");
  const jobRows = offlineReport.jobGains
    .slice(0, 4)
    .map((entry) => `<li>${entry.name} +${formatNumber(entry.amount)}</li>`)
    .join("");

  return `
    <section class="offline-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="offline-report-title">
      <div class="offline-modal panel">
        <div class="panel-header">
          <h2 id="offline-report-title">离线结算</h2>
          <p>你离开了 ${formatDuration(offlineReport.awaySeconds)}，按离线倍率折算为 ${formatDuration(offlineReport.simulatedSeconds)} 的生产。</p>
        </div>
        <div class="offline-report-grid">
          <section>
            <h3>资源收益</h3>
            <ul>
              ${resourceRows || "<li>本次无明显资源增长</li>"}
            </ul>
          </section>
          <section>
            <h3>单位变化</h3>
            <ul>
              ${jobRows || "<li>本次无单位变化</li>"}
            </ul>
          </section>
        </div>
        <div class="offline-modal-actions">
          <button data-action="dismiss-offline-report">知道了</button>
        </div>
      </div>
    </section>
  `;
}

function renderTabButtons(activeTab: TabId, showFrontierTab: boolean): string {
  return `
    <nav class="tab-strip" aria-label="${uiCopy.tabs.ariaLabel}">
      <button data-action="switch-tab" data-id="campus" ${activeTab === "campus" ? 'data-state="active"' : ""}>${uiCopy.tabs.campus}</button>
      ${showFrontierTab ? `<button data-action="switch-tab" data-id="frontier" ${activeTab === "frontier" ? 'data-state="active"' : ""}>${uiCopy.tabs.frontier}</button>` : ""}
    </nav>
  `;
}

function renderCampusView(state: GameState, showDevText: boolean): string {
  const campusBuildings = renderBuildingRows(
    state,
    (building) => !isFrontierBuildingId(building.id),
    showDevText,
  );
  const campusTechs = renderTechRows(
    state,
    (tech) => !isFrontierTechId(tech.id),
    showDevText,
  );
  const frontierHint = isLifeModuleUnlocked(state)
    ? getModeCopy(uiCopy.campus.frontierHint.unlocked, showDevText)
    : getModeCopy(uiCopy.campus.frontierHint.locked, showDevText);

  return `
    <section class="content-column">
      <section class="panel intro-panel">
        <div class="panel-header">
          ${showDevText ? `<h1>${uiCopy.campus.introHeadingDev}</h1>` : ""}
          <p>${getModeCopy(uiCopy.campus.introLead, showDevText)}</p>
          <p>${frontierHint}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>${uiCopy.campus.sections.actions.title}</h2>
          <p>${getModeCopy(uiCopy.campus.sections.actions.description, showDevText)}</p>
        </div>
        <div class="action-stack action-row">
          ${manualActionDefinitions
            .filter((action) => isManualActionUnlocked(state, action.id))
            .map(
              (action) =>
                `<button data-action="gather" data-id="${action.targetResourceId}">${action.label}</button>`,
            )
            .join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>${uiCopy.campus.sections.jobs.title}</h2>
          <p>${getModeCopy(uiCopy.campus.sections.jobs.description, showDevText)}</p>
        </div>
        <div class="panel-body">${renderJobRows(state, showDevText)}</div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>${uiCopy.campus.sections.buildings.title}</h2>
          <p>${getModeCopy(uiCopy.campus.sections.buildings.description, showDevText)}</p>
        </div>
        <div class="panel-body">${campusBuildings}</div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>${uiCopy.campus.sections.techs.title}</h2>
          <p>${getModeCopy(uiCopy.campus.sections.techs.description, showDevText)}</p>
        </div>
        <div class="panel-body">${campusTechs}</div>
      </section>
    </section>
  `;
}

function renderSummaryCard(label: string, value: string, note: string, variant = ""): string {
  return `
    <div class="summary-card ${variant}">
      <div class="summary-label">${label}</div>
      <strong class="summary-value">${value}</strong>
      <span class="summary-note">${note}</span>
    </div>
  `;
}

function renderModuleCards(state: GameState, showDevText: boolean): string {
  if (!isLifeModuleUnlocked(state)) {
    return `
      <section class="panel">
        <div class="panel-header">
          <h2>${uiCopy.frontier.currentDirection.title}</h2>
          <p>${getModeCopy(uiCopy.frontier.currentDirection.lockedDescription, showDevText)}</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-header">
        <h2>${uiCopy.frontier.currentDirection.title}</h2>
        <p>${getModeCopy(uiCopy.frontier.currentDirection.activeDescription, showDevText)}</p>
      </div>
      <div class="module-grid">
        <article class="module-card module-card--active">
          <div class="module-tag">${uiCopy.frontier.currentDirection.card.tag}</div>
          <h3>${uiCopy.frontier.currentDirection.card.title}</h3>
          <p>${uiCopy.frontier.currentDirection.card.body}</p>
          <span>${uiCopy.frontier.currentDirection.card.footer}</span>
        </article>
      </div>
    </section>
  `;
}

function renderAwakeningPanel(state: GameState, showDevText: boolean): string {
  const preview = getAwakeningPreview(state);
  const canConfirm = canAwaken(state);
  const unlockNote = preview.unlockText;
  const panelCopy = uiCopy.frontier.awakeningPanel;

  return `
    <section class="panel">
      <div class="panel-header">
        <h2>${panelCopy.title}</h2>
        ${showDevText ? `<p>${panelCopy.devLead}</p>` : ""}
      </div>
      <div class="awakening-preview-grid">
        ${renderSummaryCard(panelCopy.summary.lineageLabel, formatNumber(preview.studyTraceGain), panelCopy.summary.lineageNote)}
        ${renderSummaryCard(panelCopy.summary.currentMultiplierLabel, `x${formatNumber(preview.currentMultiplier)}`, panelCopy.summary.currentMultiplierNote)}
        ${renderSummaryCard(panelCopy.summary.nextMultiplierLabel, `x${formatNumber(preview.nextMultiplier)}`, unlockNote)}
      </div>
      <div class="awakening-columns">
        <section>
          <h3>${panelCopy.sections.lose}</h3>
          <ul class="mini-list">
            ${panelCopy.loseItems.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </section>
        <section>
          <h3>${panelCopy.sections.keep}</h3>
          <ul class="mini-list">
            <li>${panelCopy.keepLabels.lineage} ${formatNumber(state.prestige.academicLineage)}</li>
            <li>${panelCopy.keepLabels.starCharts} ${formatNumber(state.prestige.starCharts)}</li>
            <li>${panelCopy.keepLabels.cycles} ${state.prestige.cycle}</li>
          </ul>
        </section>
        <section>
          <h3>${panelCopy.sections.gain}</h3>
          <ul class="mini-list">
            <li>${panelCopy.gainLabels.lineage} +${formatNumber(preview.lineageGain)}</li>
            <li>由 ${formatNumber(preview.studyTraceGain)} 学迹按 ${preview.conversionRate}:1 转化</li>
            ${panelCopy.gainItems.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </section>
      </div>
      <div class="frontier-actions">
        <button data-action="open-awakening-confirm" ${canConfirm ? "" : "disabled"}>${panelCopy.button}</button>
        <span class="frontier-note">${canConfirm ? panelCopy.buttonNoteReady : panelCopy.buttonNoteBlocked}</span>
      </div>
    </section>
  `;
}

function renderLifeBreakthroughPanel(state: GameState, showDevText: boolean): string {
  const breakthroughCopy = uiCopy.frontier.breakthrough;
  if (!isLifeModuleUnlocked(state)) {
    return `
      <section class="panel">
        <div class="panel-header">
          <h2>${breakthroughCopy.title}</h2>
          <p>${getModeCopy(breakthroughCopy.lockedDescription, showDevText)}</p>
        </div>
      </section>
    `;
  }

  const pityThreshold = getLifePityThreshold(state);
  const singleCost = formatResourceCostText(getLifeBreakthroughCost(1));
  const multiCost = formatResourceCostText(getLifeBreakthroughCost(10));
  const dropRows = getLifeDropTable(state)
    .map((entry) => `<li>${entry.label} ${formatPercent(entry.chance)} · ${entry.description}</li>`)
    .join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <h2>${breakthroughCopy.title}</h2>
        <p>${getModeCopy(breakthroughCopy.activeDescription, showDevText)}</p>
      </div>
      <div class="frontier-actions">
        <button
          data-action="life-breakthrough"
          data-id="1"
          title="按单次花费进行 1 次破题抽取"
          ${canRunLifeBreakthrough(state, 1) ? "" : "disabled"}
        >${breakthroughCopy.actions.single}</button>
        <button
          data-action="life-breakthrough"
          data-id="10"
          title="按并行花费连续进行 10 次破题（需先解锁）"
          ${canRunLifeBreakthrough(state, 10) ? "" : "disabled"}
        >${breakthroughCopy.actions.multi}</button>
        <button
          data-action="life-evidence-pity"
          title="消耗 20 旁证，把保底累计向前推进 5 格"
          ${canSpendEvidenceForPity(state) ? "" : "disabled"}
        >${breakthroughCopy.actions.pity}</button>
        <button
          data-action="life-evidence-variant"
          title="消耗 45 旁证，直接换取 1 变异株"
          ${canExchangeEvidenceForVariant(state) ? "" : "disabled"}
        >${breakthroughCopy.actions.variant}</button>
      </div>
      <div class="frontier-meta-grid">
        ${renderSummaryCard(
          breakthroughCopy.summaryLabels.singleCost,
          singleCost,
          getModeCopy(breakthroughCopy.singleCostNote, showDevText),
          "summary-card--wide",
        )}
        ${renderSummaryCard(
          breakthroughCopy.summaryLabels.multiCost,
          multiCost,
          showDevText
            ? (isParallelLifeBreakthroughUnlocked(state)
              ? breakthroughCopy.multiCostNote.devUnlocked
              : breakthroughCopy.multiCostNote.devLocked)
            : (isParallelLifeBreakthroughUnlocked(state)
              ? breakthroughCopy.multiCostNote.playerUnlocked
              : breakthroughCopy.multiCostNote.playerLocked),
          "summary-card--wide",
        )}
        ${renderSummaryCard(
          breakthroughCopy.summaryLabels.pity,
          `${state.frontier.lifePity}/${pityThreshold}`,
          showDevText ? formatLifePityNote(pityThreshold) : breakthroughCopy.pityNote.player,
        )}
      </div>
      ${showDevText ? `
      <div class="frontier-drop-table">
        <h3>${breakthroughCopy.dropTableTitle}</h3>
        <ul class="mini-list">${dropRows}</ul>
      </div>
      ` : ""}
      <div class="frontier-note-row">
        ${(showDevText ? breakthroughCopy.notes.dev : breakthroughCopy.notes.player)
          .map((note) => `<span>${note}</span>`)
          .join("")}
      </div>
    </section>
  `;
}

function renderFrontierView(state: GameState, showDevText: boolean): string {
  const lifeBuildings = renderBuildingRows(
    state,
    (building) => building.id.startsWith("bld.frontier.life."),
    showDevText,
  );
  const lifeTechs = renderTechRows(
    state,
    (tech) => tech.id.startsWith("tech.frontier.life."),
    showDevText,
  );
  const frontierCopy = uiCopy.frontier;

  return `
    <section class="content-column">
      <section class="panel intro-panel frontier-intro">
        <div class="panel-header">
          <span class="panel-kicker">${frontierCopy.intro.kicker}</span>
          ${showDevText ? `<h1>${frontierCopy.intro.headingDev}</h1>` : ""}
          <p>${getModeCopy(frontierCopy.intro.lead, showDevText)}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>${frontierCopy.summary.title}</h2>
          <p>${getModeCopy(frontierCopy.summary.description, showDevText)}</p>
        </div>
        <div class="frontier-meta-grid">
          ${renderSummaryCard("周目", `${state.prestige.cycle}`, state.prestige.cycle > 1 ? `时间倍率 x${formatNumber(state.time.prestigeMultiplier)}` : frontierCopy.summary.cycleLocked)}
          ${renderSummaryCard(frontierCopy.summary.lineageLabel, formatNumber(state.prestige.academicLineage), getModeCopy(frontierCopy.summary.lineageNote, showDevText))}
          ${renderSummaryCard("星图", formatNumber(state.prestige.starCharts), getModeCopy(frontierCopy.summary.starNote, showDevText))}
          ${renderSummaryCard("菌株", formatNumber(state.resources["res.frontier.life.strain_points"]), getModeCopy(frontierCopy.summary.strainNote, showDevText))}
          ${renderSummaryCard("变异株", formatNumber(state.resources["res.frontier.life.variant_points"]), getModeCopy(frontierCopy.summary.variantNote, showDevText))}
          ${renderSummaryCard("旁证", formatNumber(state.resources["res.frontier.evidence_points"]), getModeCopy(frontierCopy.summary.evidenceNote, showDevText))}
        </div>
      </section>

      ${renderModuleCards(state, showDevText)}
      ${renderLifeBreakthroughPanel(state, showDevText)}

      <section class="panel">
        <div class="panel-header">
          <h2>${frontierCopy.lifeFacilities.title}</h2>
          <p>${getModeCopy(frontierCopy.lifeFacilities.description, showDevText)}</p>
        </div>
        <div class="panel-body">${lifeBuildings || `<div class="row-meta">${frontierCopy.lifeFacilities.empty}</div>`}</div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>${frontierCopy.lifeProjects.title}</h2>
          <p>${getModeCopy(frontierCopy.lifeProjects.description, showDevText)}</p>
        </div>
        <div class="panel-body">${lifeTechs || `<div class="row-meta">${frontierCopy.lifeProjects.empty}</div>`}</div>
      </section>

      ${renderAwakeningPanel(state, showDevText)}
    </section>
  `;
}

function getBannerStageLabel(state: GameState): string {
  return `第 ${state.prestige.cycle} 周目`;
}

function renderAwakeningModal(state: GameState): string {
  const preview = getAwakeningPreview(state);
  const awakeningCopy = uiCopy.frontier.modals.awakening;
  return `
    <section class="offline-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="awakening-modal-title">
      <div class="offline-modal panel awakening-modal">
        <div class="panel-header">
          <h2 id="awakening-modal-title">${awakeningCopy.title}</h2>
          <p>${awakeningCopy.description}</p>
        </div>
        <div class="awakening-columns">
          <section>
            <h3>${awakeningCopy.loseTitle}</h3>
            <ul class="mini-list">
              ${awakeningCopy.loseItems.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </section>
          <section>
            <h3>${awakeningCopy.keepTitle}</h3>
            <ul class="mini-list">
              <li>${awakeningCopy.keepLabels.lineage} ${formatNumber(state.prestige.academicLineage)}</li>
              <li>${awakeningCopy.keepLabels.starCharts} ${formatNumber(state.prestige.starCharts)}</li>
              <li>${awakeningCopy.keepLabels.cycles} ${state.prestige.cycle}</li>
            </ul>
          </section>
          <section>
            <h3>${awakeningCopy.gainTitle}</h3>
            <ul class="mini-list">
              <li>${awakeningCopy.gainLabels.lineage} +${formatNumber(preview.lineageGain)}</li>
              <li>${awakeningCopy.gainLabels.conversionPrefix} ${formatNumber(preview.studyTraceGain)} 学迹（${preview.conversionRate}:1）</li>
              <li>${awakeningCopy.gainLabels.timeMultiplierPrefix} x${formatNumber(preview.currentMultiplier)} 提高到 x${formatNumber(preview.nextMultiplier)}</li>
              <li>${preview.unlockText}</li>
            </ul>
          </section>
        </div>
        <div class="offline-modal-actions">
          <button data-action="confirm-awakening" ${preview.lineageGain > 0 ? "" : "disabled"}>${awakeningCopy.confirm}</button>
          <button data-action="cancel-awakening">${awakeningCopy.cancel}</button>
        </div>
      </div>
    </section>
  `;
}

function renderHardResetModal(): string {
  const hardResetCopy = uiCopy.frontier.modals.hardReset;
  return `
    <section class="offline-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="hard-reset-modal-title">
      <div class="offline-modal panel hard-reset-modal">
        <div class="panel-header">
          <h2 id="hard-reset-modal-title">${hardResetCopy.title}</h2>
          <p>${hardResetCopy.description}</p>
        </div>
        <div class="awakening-columns">
          <section>
            <h3>${hardResetCopy.resetTitle}</h3>
            <ul class="mini-list">
              ${hardResetCopy.resetItems.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </section>
          <section>
            <h3>${hardResetCopy.backupTitle}</h3>
            <ul class="mini-list">
              ${hardResetCopy.backupItems.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </section>
          <section>
            <h3>${hardResetCopy.distinctionTitle}</h3>
            <ul class="mini-list">
              ${hardResetCopy.distinctionItems.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </section>
        </div>
        <div class="offline-modal-actions">
          <button class="danger-button" data-action="confirm-hard-reset">${hardResetCopy.confirm}</button>
          <button data-action="cancel-hard-reset">${hardResetCopy.cancel}</button>
        </div>
      </div>
    </section>
  `;
}

function renderActionFeedbackModal(modal: ActionFeedbackModal): string {
  return `
    <section class="offline-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="action-feedback-modal-title">
      <div class="offline-modal panel action-feedback-modal">
        <div class="panel-header">
          <h2 id="action-feedback-modal-title">${modal.title}</h2>
          <p>${modal.message}</p>
        </div>
        <div class="offline-modal-actions">
          <button data-action="dismiss-action-feedback">${modal.confirmLabel}</button>
        </div>
      </div>
    </section>
  `;
}

function renderFloatingNotice(message: string): string {
  return `
    <section class="floating-notice" role="status" aria-live="polite">
      <span>${message}</span>
    </section>
  `;
}

export function renderApp(
  root: HTMLElement,
  state: GameState,
  activeTheme: UiThemeId,
  devToolsUnlocked: boolean,
  offlineReport: OfflineReport | null,
  showAwakeningConfirm: boolean,
  showHardResetConfirm: boolean,
  floatingNotice: string | null,
  actionFeedbackModal: ActionFeedbackModal | null,
): void {
  const showDevText = devToolsUnlocked;
  const showFrontierTab = isLifeModuleUnlocked(state);
  const activeTab = showFrontierTab && state.ui.activeTab === "frontier" ? "frontier" : "campus";
  if (state.ui.activeTab !== activeTab) {
    state.ui.activeTab = activeTab;
  }
  const devToolsHtml = devToolsUnlocked
    ? `
        <span class="time-scale-readout" title="游戏使用 performance.now 与内部倍率结算，不依赖系统时钟。">
          时间倍率 x${formatNumber(getEffectiveTimeScale(state))}
        </span>
        <div class="time-scale-controls">
          ${renderTimeControls(state)}
        </div>
        <button data-action="debug-unlock-all" title="测试模式：填充第一周目后期模板（可觉醒前夕），不再使用全设施 x10">测试满配</button>
        <span class="dev-mode-badge">测试模式</span>
      `
    : "";

  root.innerHTML = `
    <main class="app-shell">
      <header class="top-banner">
        <div class="banner-left">
          <span class="banner-title">Research Evolution</span>
          <span class="banner-stage">${getBannerStageLabel(state)}</span>
        </div>
        <div class="banner-right">
          ${devToolsHtml}
          <div class="theme-picker">
            <label for="theme-select">风格</label>
            <select id="theme-select" data-action="set-theme">
              ${renderThemeOptions(activeTheme)}
            </select>
          </div>
          <div class="save-controls">
            <button data-action="export-save" title="${uiCopy.saveControls.exportTitle}">导出存档</button>
            <button data-action="import-save" title="${uiCopy.saveControls.importTitle}">导入存档</button>
            <input
              id="save-file-input"
              data-action="import-save-file"
              type="file"
              accept=".revo,.txt,.json,text/plain,application/json"
              hidden
            />
          </div>
          <span>本地自动存档</span>
          <span>版本 0.2.0</span>
          <button
            class="banner-reset-button"
            data-action="open-hard-reset-confirm"
            title="${uiCopy.saveControls.hardResetButtonTitle}"
          >
            重置全部进度
          </button>
        </div>
      </header>

      <section class="main-layout">
        <aside class="sidebar panel">
          <div class="panel-header">
            <h2>${uiCopy.sidebar.resources.title}</h2>
            <p>${getModeCopy(uiCopy.sidebar.resources.description, showDevText)}</p>
          </div>
          <div class="panel-body" data-panel="resources">${renderResourceRows(state, showDevText)}</div>
        </aside>

        <section class="content-workspace">
          ${renderTabButtons(activeTab, showFrontierTab)}
          <div class="tab-content">
            ${activeTab === "campus" ? renderCampusView(state, showDevText) : renderFrontierView(state, showDevText)}
          </div>
        </section>
      </section>

      <section class="bottom-log panel">
        <div class="panel-header">
          <h2>${uiCopy.footerLog.title}</h2>
          <p>${getModeCopy(uiCopy.footerLog.description, showDevText)}</p>
        </div>
        <ol class="log-list">${renderLogRows(state)}</ol>
      </section>
    </main>
    ${showAwakeningConfirm ? renderAwakeningModal(state) : ""}
    ${showHardResetConfirm ? renderHardResetModal() : ""}
    ${offlineReport ? renderOfflineReport(offlineReport) : ""}
    ${actionFeedbackModal ? renderActionFeedbackModal(actionFeedbackModal) : ""}
    ${floatingNotice ? renderFloatingNotice(floatingNotice) : ""}
  `;
}

export function refreshResourcePanel(
  root: HTMLElement,
  state: GameState,
  showDevText: boolean,
): boolean {
  const panel = root.querySelector<HTMLElement>('[data-panel="resources"]');
  if (!panel) {
    return false;
  }

  const rows = Array.from(panel.querySelectorAll<HTMLElement>("[data-resource-id]"));
  const visibleRowKeys = getVisibleResourceRowKeys(state);
  const structureMatches =
    rows.length === visibleRowKeys.length &&
    rows.every((row, index) => row.dataset.resourceId === visibleRowKeys[index]);

  if (!structureMatches) {
    panel.innerHTML = renderResourceRows(state, showDevText);
    return true;
  }

  visibleRowKeys.forEach((rowKey, index) => {
    const row = rows[index];
    const valueNode = row.querySelector<HTMLElement>('[data-field="value"]');
    const rateNode = row.querySelector<HTMLElement>('[data-field="rate"]');
    if (!valueNode || !rateNode) {
      return;
    }

    if (rowKey === "meta.headcount") {
      const used = getHeadcountUsed(state);
      const limit = getHeadcountLimit(state);
      valueNode.textContent = `${used}/${limit}`;
      rateNode.textContent = showDevText ? "职员 + 研究生" : "";
      return;
    }

    if (rowKey === "meta.lineage") {
      valueNode.textContent = formatNumber(state.prestige.academicLineage);
      rateNode.textContent = "";
      return;
    }

    if (rowKey === "meta.starCharts") {
      valueNode.textContent = formatNumber(state.prestige.starCharts);
      rateNode.textContent = "";
      return;
    }

    const resource = resourceDefinitions.find((entry) => entry.id === rowKey);
    if (!resource) {
      return;
    }

    const amount = state.resources[resource.id];
    const limit = getResourceLimit(state, resource.id);
    const perSecond = getProductionPerSecond(state, resource.id);
    valueNode.textContent = `${formatNumber(amount)}/${formatNumber(limit)}`;
    rateNode.textContent = `${perSecond >= 0 ? "+" : ""}${formatNumber(perSecond)}/秒`;
  });

  return false;
}

export function getUiUnlockFingerprint(state: GameState): string {
  const manualActions = manualActionDefinitions
    .filter((action) => isManualActionUnlocked(state, action.id))
    .map((action) => action.id)
    .join(",");
  const jobs = jobDefinitions
    .filter((job) => isJobUnlocked(state, job.id))
    .map((job) => job.id)
    .join(",");
  const buildings = buildingDefinitions
    .filter((building) => isBuildingUnlocked(state, building.id))
    .map((building) => building.id)
    .join(",");
  const techs = techDefinitions
    .filter((tech) => isTechUnlocked(state, tech.id))
    .map((tech) => tech.id)
    .join(",");
  const unlockedFlags = getUnlockedFlags(state);
  const innovationFlag = unlockedFlags.innovation ? "innovation:1" : "innovation:0";
  const frontierFlag = unlockedFlags.frontier ? "frontier:1" : "frontier:0";
  const cycleFlag = `cycle:${state.prestige.cycle}`;

  return [manualActions, jobs, buildings, techs, innovationFlag, frontierFlag, cycleFlag].join("|");
}
