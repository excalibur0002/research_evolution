import { buildingDefinitions } from "../data/buildings";
import { manualActionDefinitions } from "../data/game-config";
import { jobDefinitions, jobNameById } from "../data/jobs";
import { resourceDefinitions, resourceNameById } from "../data/resources";
import { techDefinitions } from "../data/techs";
import {
  canAfford,
  canAffordJobs,
  getHeadcountLimit,
  getHeadcountUsed,
  isManualActionUnlocked,
  hasHeadcountForJob,
  getProductionPerSecond,
  getResourceLimit,
  getUnlockedFlags,
  isBuildingUnlocked,
  isJobUnlocked,
  isTechUnlocked,
} from "../game/formulas";
import type { GameState } from "../game/state";
import { formatNumber } from "../utils/format";

type ResourceRowKey = string;

function formatResourceCostText(
  cost: Partial<Record<keyof typeof resourceNameById, number>> | undefined,
): string {
  if (!cost) {
    return "";
  }

  return Object.entries(cost)
    .map(
      ([resourceId, amount]) =>
        `${resourceNameById[resourceId as keyof typeof resourceNameById]} ${amount}`,
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
  resourceCost: Partial<Record<keyof typeof resourceNameById, number>> | undefined,
  jobCost: Partial<Record<keyof typeof jobNameById, number>> | undefined,
): string {
  const chunks = [formatResourceCostText(resourceCost), formatJobCostText(jobCost)].filter(Boolean);
  return chunks.join(" / ");
}

function getVisibleResourceRowKeys(state: GameState): ResourceRowKey[] {
  const unlocked = getUnlockedFlags(state);
  const resourceKeys = resourceDefinitions
    .filter(
      (resource) =>
        resource.visibleFromStart ||
        (resource.id === "res.acad.innovation_points" && unlocked.innovation) ||
        (resource.id === "res.future.space_points" && unlocked.space),
    )
    .map((resource) => resource.id);

  return [...resourceKeys, "meta.headcount"];
}

function renderResourceRows(state: GameState): string {
  return getVisibleResourceRowKeys(state)
    .map((rowKey) => renderResourceRowByKey(state, rowKey))
    .join("");
}

function renderResourceRowByKey(state: GameState, rowKey: ResourceRowKey): string {
  if (rowKey === "meta.headcount") {
    const used = getHeadcountUsed(state);
    const limit = getHeadcountLimit(state);
    return `
      <div class="resource-row compact-resource" data-resource-id="${rowKey}" title="编制决定可沉淀的职员与研究生总量。">
        <div class="row-title">编制</div>
        <div class="row-metric">
          <strong data-field="value">${used}/${limit}</strong>
          <span data-field="rate">职员 + 研究生</span>
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

  return `
    <div class="resource-row compact-resource" data-resource-id="${resource.id}" title="${resource.description}">
      <div class="row-title">${resource.name}</div>
      <div class="row-metric">
        <strong data-field="value">${formatNumber(amount)}/${formatNumber(limit)}</strong>
        <span data-field="rate">${perSecond >= 0 ? "+" : ""}${formatNumber(perSecond)}/秒</span>
      </div>
    </div>
  `;
}

function renderJobRows(state: GameState): string {
  return jobDefinitions
    .filter((job) => isJobUnlocked(state, job.id))
    .map((job) => {
      const produces = Object.entries(job.producesPerSecond)
        .map(
          ([resourceId, amount]) =>
            `${resourceNameById[resourceId as keyof typeof resourceNameById]} +${amount}/秒`,
        )
        .join(" / ");
      const costText = Object.entries(job.cost ?? {})
        .map(
          ([resourceId, amount]) =>
            `${resourceNameById[resourceId as keyof typeof resourceNameById]} ${amount}`,
        )
        .join(" / ");
      const canAcquire = canAfford(state, job.cost);
      const hasHeadcount = hasHeadcountForJob(state, job.id);
      const sellable = state.jobs[job.id] > 0;
      const action = `
        <div class="action-pair">
          <button data-action="acquire-job" data-id="${job.id}" ${(canAcquire && hasHeadcount) ? "" : "disabled"}>${job.actionLabel}</button>
          <button data-action="sell-job" data-id="${job.id}" ${sellable ? "" : "disabled"}>${job.releaseLabel}</button>
        </div>
      `;

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${job.name} <span class="count-tag">x${state.jobs[job.id]}</span></div>
            <div class="row-meta">${job.description}</div>
            <div class="row-meta">${produces || "当前不产出资源"}</div>
            <div class="row-meta">沉淀成本: ${costText || "无"}</div>
          </div>
          <div class="row-action">${action}</div>
        </div>
      `;
    })
    .join("");
}

function renderBuildingRows(state: GameState): string {
  return buildingDefinitions
    .filter((building) => isBuildingUnlocked(state, building.id))
    .map((building) => {
      const costText = formatCombinedCostText(building.cost, building.jobCost);
      const canBuy = canAfford(state, building.cost) && canAffordJobs(state, building.jobCost);
      const sellable = state.buildings[building.id] > 0;
      const canToggle = building.toggleable && state.buildings[building.id] > 0;
      const toggleLabel = state.buildingEnabled[building.id] ? "关闭" : "开启";
      const statusText = building.toggleable
        ? state.buildingEnabled[building.id]
          ? "运行中"
          : "已关闭"
        : "常开";
      const conversionText =
        building.conversion
          ? ` | 转化: ${building.effectText}`
          : ` | 效果: ${building.effectText}`;

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${building.name} <span class="count-tag">x${state.buildings[building.id]}</span></div>
            <div class="row-meta">${building.description}</div>
            <div class="row-meta">建造成本: ${costText} | 状态: ${statusText}${conversionText}</div>
          </div>
          <div class="row-action">
            <div class="action-pair">
              <button data-action="buy-building" data-id="${building.id}" ${canBuy ? "" : "disabled"}>建造</button>
              <button data-action="sell-building" data-id="${building.id}" ${sellable ? "" : "disabled"}>出售</button>
              ${building.toggleable ? `<button data-action="toggle-building" data-id="${building.id}" ${canToggle ? "" : "disabled"}>${toggleLabel}</button>` : ""}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderTechRows(state: GameState): string {
  return techDefinitions
    .filter((tech) => isTechUnlocked(state, tech.id))
    .map((tech) => {
      const costText = formatCombinedCostText(tech.cost, tech.jobCost);
      const status = state.techs[tech.id] ? "已完成" : "待研究";
      const affordable = canAfford(state, tech.cost) && canAffordJobs(state, tech.jobCost);
      const actionLabel = state.techs[tech.id] ? "已完成" : affordable ? "研究" : "锁定";
      const actionAttrs = state.techs[tech.id]
        ? "disabled"
        : affordable
          ? ""
          : 'disabled data-state="locked"';

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${tech.name} <span class="count-tag">${status}</span></div>
            <div class="row-meta">${tech.description}</div>
            <div class="row-meta">成本: ${costText}</div>
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

export function renderApp(root: HTMLElement, state: GameState): void {
  root.innerHTML = `
    <main class="app-shell">
      <header class="top-banner">
        <div class="banner-left">
          <span class="banner-title">Research Evolution</span>
          <span class="banner-stage">校园研发起步期</span>
        </div>
        <div class="banner-right">
          <span>存档功能预留</span>
          <span>设置预留</span>
          <span>版本 0.1.0</span>
        </div>
      </header>

      <section class="main-layout">
        <aside class="sidebar panel">
          <div class="panel-header">
            <h2>基础资源</h2>
            <p>悬停可查看资源说明，显示格式为 当前/上限 与 每秒变化。</p>
          </div>
          <div class="panel-body" data-panel="resources">${renderResourceRows(state)}</div>
        </aside>

        <section class="content-column">
          <section class="panel intro-panel">
            <div class="panel-header">
              <h1>科研与工程的互锁增量原型</h1>
              <p>
                大学生作为底层资源被持续消耗与沉淀，科技点和工程点共同驱动建筑与科技解锁。
              </p>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <h2>行动</h2>
              <p>按钮会按进度逐步解锁：学习 -> 打工 -> 科研。</p>
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
              <h2>单位管理</h2>
              <p>通过沉淀把大学生转化为职员或研究生。</p>
            </div>
            <div class="panel-body">${renderJobRows(state)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <h2>建筑</h2>
              <p>建筑负责资源来源、倍率增益与资源上限扩展。</p>
            </div>
            <div class="panel-body">${renderBuildingRows(state)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <h2>研究项目</h2>
              <p>研究负责手动效率提升和新单位/新建筑解锁。</p>
            </div>
            <div class="panel-body">${renderTechRows(state)}</div>
          </section>
        </section>
      </section>

      <section class="bottom-log panel">
        <div class="panel-header">
          <h2>进展日志</h2>
          <p>关键动作与解锁提示会在这里滚动显示。</p>
        </div>
        <ol class="log-list">${renderLogRows(state)}</ol>
      </section>
    </main>
  `;
}

export function refreshResourcePanel(root: HTMLElement, state: GameState): boolean {
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
    panel.innerHTML = renderResourceRows(state);
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
      rateNode.textContent = "职员 + 研究生";
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
  const spaceFlag = unlockedFlags.space ? "space:1" : "space:0";

  return [manualActions, jobs, buildings, techs, innovationFlag, spaceFlag].join("|");
}
