import { buildingDefinitions } from "../data/buildings";
import { manualActionDefinitions } from "../data/game-config";
import { jobDefinitions } from "../data/jobs";
import { resourceDefinitions, resourceNameById } from "../data/resources";
import { techDefinitions } from "../data/techs";
import {
  canAfford,
  isManualActionUnlocked,
  getProductionPerSecond,
  getResourceLimit,
  getUnlockedFlags,
  isBuildingUnlocked,
  isJobUnlocked,
  isTechUnlocked,
} from "../game/formulas";
import type { GameState } from "../game/state";
import { formatNumber } from "../utils/format";

function renderResourceRows(state: GameState): string {
  const unlocked = getUnlockedFlags(state);

  return resourceDefinitions
    .filter(
      (resource) =>
        resource.visibleFromStart ||
        (resource.id === "res.future.space_points" && unlocked.space),
    )
    .map((resource) => {
      const perSecond = getProductionPerSecond(state, resource.id);
      const amount = state.resources[resource.id];
      const limit = getResourceLimit(state, resource.id);

      return `
        <div class="resource-row compact-resource" title="${resource.description}">
          <div class="row-title">${resource.name}</div>
          <div class="row-metric">
            <strong>${formatNumber(amount)}/${formatNumber(limit)}</strong>
            <span>${perSecond >= 0 ? "+" : ""}${formatNumber(perSecond)}/秒</span>
          </div>
        </div>
      `;
    })
    .join("");
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
      const action = `<button data-action="acquire-job" data-id="${job.id}" ${canAcquire ? "" : 'data-state="soft-disabled"'}>${job.actionLabel}</button>`;

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${job.name} <span class="count-tag">x${state.jobs[job.id]}</span></div>
            <div class="row-meta">${job.description}</div>
            <div class="row-meta">${produces || "当前不产出资源"}</div>
            <div class="row-meta">成本: ${costText || "无"}</div>
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
      const costText = Object.entries(building.cost)
        .map(
          ([resourceId, amount]) =>
            `${resourceNameById[resourceId as keyof typeof resourceNameById]} ${amount}`,
        )
        .join(" / ");
      const canBuy = canAfford(state, building.cost);

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${building.name} <span class="count-tag">x${state.buildings[building.id]}</span></div>
            <div class="row-meta">${building.description}</div>
            <div class="row-meta">成本: ${costText} | 效果: ${building.effectText}</div>
          </div>
          <div class="row-action">
            <button data-action="buy-building" data-id="${building.id}" ${canBuy ? "" : 'data-state="soft-disabled"'}>建造</button>
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
      const costText = Object.entries(tech.cost)
        .map(
          ([resourceId, amount]) =>
            `${resourceNameById[resourceId as keyof typeof resourceNameById]} ${amount}`,
        )
        .join(" / ");
      const status = state.techs[tech.id] ? "已完成" : "待研究";

      return `
        <div class="list-row">
          <div>
            <div class="row-title">${tech.name} <span class="count-tag">${status}</span></div>
            <div class="row-meta">${tech.description}</div>
            <div class="row-meta">成本: ${costText}</div>
          </div>
          <div class="row-action">
            <button data-action="research-tech" data-id="${tech.id}" ${state.techs[tech.id] ? "disabled" : ""}>研究</button>
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
          <div class="panel-body">${renderResourceRows(state)}</div>
        </aside>

        <section class="content-column">
          <section class="panel intro-panel">
            <div class="panel-header">
              <h1>科研与工程的互锁增量原型</h1>
              <p>
                大学生作为底层资源被持续消耗与沉淀，科技点和项目点共同驱动建筑与科技解锁。
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
