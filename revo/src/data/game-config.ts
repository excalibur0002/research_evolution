export type ResourceId =
  | "res.core.undergraduates"
  | "res.core.topic_points"
  | "res.core.project_points"
  | "res.future.space_points";

export type ManualActionId =
  | "act.manual.study"
  | "act.manual.work"
  | "act.manual.research";

export type JobId =
  | "job.ops.staff"
  | "job.acad.research_grad";

export type BuildingId =
  | "bld.source.university"
  | "bld.capacity.dorm"
  | "bld.capacity.apartment"
  | "bld.life.cafeteria"
  | "bld.org.admin_office"
  | "bld.acad.junior_faculty"
  | "bld.acad.professor"
  | "bld.acad.changjiang_scholar";

export type TechId =
  | "tech.manual.study_notes"
  | "tech.manual.side_jobs"
  | "tech.acad.grad_admissions"
  | "tech.ops.process_management";

type CountMap<T extends string> = Partial<Record<T, number>>;

export type UnlockRequirement = {
  resources?: CountMap<ResourceId>;
  jobs?: CountMap<JobId>;
  buildings?: CountMap<BuildingId>;
  techs?: TechId[];
};

export type ResourceDefinition = {
  id: ResourceId;
  name: string;
  shortName: string;
  description: string;
  visibleFromStart: boolean;
  baseLimit: number;
};

export type ManualActionDefinition = {
  id: ManualActionId;
  label: string;
  targetResourceId: Extract<
    ResourceId,
    "res.core.undergraduates" | "res.core.topic_points" | "res.core.project_points"
  >;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  baseYield: number;
  boostedYield?: number;
  boostTechId?: TechId;
  logLabel: string;
};

export type JobDefinition = {
  id: JobId;
  name: string;
  description: string;
  actionLabel: string;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  cost: CountMap<ResourceId>;
  producesPerSecond: CountMap<ResourceId>;
};

export type BuildingDefinition = {
  id: BuildingId;
  name: string;
  description: string;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  cost: CountMap<ResourceId>;
  effectText: string;
  producesPerSecond?: CountMap<ResourceId>;
  productionMultiplier?: CountMap<ResourceId>;
  resourceLimitBonus?: CountMap<ResourceId>;
};

export type TechDefinition = {
  id: TechId;
  name: string;
  description: string;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  cost: CountMap<ResourceId>;
  resourceLimitBonus?: CountMap<ResourceId>;
};

export const resourceDefinitions: ResourceDefinition[] = [
  {
    id: "res.core.undergraduates",
    name: "大学生",
    shortName: "大学生",
    description: "最基础的人力资源，整个系统都会争抢它。",
    visibleFromStart: true,
    baseLimit: 10,
  },
  {
    id: "res.core.topic_points",
    name: "科技点",
    shortName: "科技",
    description: "来自科研体系的推进资源。",
    visibleFromStart: true,
    baseLimit: 80,
  },
  {
    id: "res.core.project_points",
    name: "项目点",
    shortName: "项目",
    description: "来自打工、执行与工业组织的推进资源。",
    visibleFromStart: true,
    baseLimit: 80,
  },
  {
    id: "res.future.space_points",
    name: "宇航点",
    shortName: "宇航",
    description: "后期宇宙探索资源占位，当前版本只做方向预留。",
    visibleFromStart: false,
    baseLimit: 99999,
  },
];

export const manualActionDefinitions: ManualActionDefinition[] = [
  {
    id: "act.manual.study",
    label: "学习",
    targetResourceId: "res.core.undergraduates",
    unlockedFromStart: true,
    baseYield: 0.1,
    logLabel: "学习",
  },
  {
    id: "act.manual.work",
    label: "打工",
    targetResourceId: "res.core.project_points",
    unlockedFromStart: false,
    unlockWhen: {
      jobs: {
        "job.ops.staff": 1,
      },
      buildings: {
        "bld.source.university": 1,
      },
    },
    baseYield: 1.2,
    boostedYield: 2.2,
    boostTechId: "tech.manual.side_jobs",
    logLabel: "打工",
  },
  {
    id: "act.manual.research",
    label: "科研",
    targetResourceId: "res.core.topic_points",
    unlockedFromStart: false,
    unlockWhen: {
      jobs: {
        "job.ops.staff": 2,
      },
      resources: {
        "res.core.project_points": 6,
      },
    },
    baseYield: 1.1,
    boostedYield: 2.1,
    boostTechId: "tech.manual.study_notes",
    logLabel: "科研",
  },
];

export const manualActionDefinitionsById: Record<ManualActionId, ManualActionDefinition> =
  Object.fromEntries(
    manualActionDefinitions.map((action) => [action.id, action]),
  ) as Record<ManualActionId, ManualActionDefinition>;

export const jobDefinitions: JobDefinition[] = [
  {
    id: "job.ops.staff",
    name: "职员",
    description: "被沉淀进项目体系的基础执行单位。",
    actionLabel: "沉淀",
    unlockedFromStart: true,
    cost: {
      "res.core.undergraduates": 4,
    },
    producesPerSecond: {
      "res.core.project_points": 0.55,
    },
  },
  {
    id: "job.acad.research_grad",
    name: "研究生",
    description: "被沉淀进学术体系的核心单位。",
    actionLabel: "沉淀",
    unlockedFromStart: false,
    unlockWhen: {
      techs: ["tech.acad.grad_admissions"],
    },
    cost: {
      "res.core.undergraduates": 5,
      "res.core.topic_points": 4,
    },
    producesPerSecond: {
      "res.core.topic_points": 0.85,
    },
  },
];

export const buildingDefinitions: BuildingDefinition[] = [
  {
    id: "bld.source.university",
    name: "大学",
    description: "最核心的来源建筑，持续生成大学生。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 14,
      "res.core.project_points": 14,
    },
    effectText: "大学生 +0.45/秒，大学生上限 +6",
    producesPerSecond: {
      "res.core.undergraduates": 0.45,
    },
    resourceLimitBonus: {
      "res.core.undergraduates": 6,
    },
  },
  {
    id: "bld.capacity.dorm",
    name: "宿舍",
    description: "提供基础安置条件，小幅提高大学生存储上限。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 8,
      "res.core.project_points": 6,
    },
    effectText: "大学生上限 +2",
    resourceLimitBonus: {
      "res.core.undergraduates": 2,
    },
  },
  {
    id: "bld.capacity.apartment",
    name: "公寓",
    description: "高级安置空间，显著提高大学生存储上限。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.capacity.dorm": 2,
      },
    },
    cost: {
      "res.core.topic_points": 20,
      "res.core.project_points": 20,
    },
    effectText: "大学生上限 +4",
    resourceLimitBonus: {
      "res.core.undergraduates": 4,
    },
  },
  {
    id: "bld.life.cafeteria",
    name: "食堂",
    description: "维持大学生日常流动，提高大学生来源效率。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 6,
      "res.core.project_points": 10,
    },
    effectText: "大学生总产出 +10%，大学生上限 +3",
    productionMultiplier: {
      "res.core.undergraduates": 0.1,
    },
    resourceLimitBonus: {
      "res.core.undergraduates": 3,
    },
  },
  {
    id: "bld.org.admin_office",
    name: "管理处",
    description: "为职员体系提供编排和行政支持。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 12,
      "res.core.project_points": 16,
    },
    effectText: "项目点总产出 +8%，项目点上限 +40",
    productionMultiplier: {
      "res.core.project_points": 0.08,
    },
    resourceLimitBonus: {
      "res.core.project_points": 40,
    },
  },
  {
    id: "bld.acad.junior_faculty",
    name: "青年教师",
    description: "早期导师建筑，提升学术体系运转效率。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 14,
      "res.core.project_points": 8,
    },
    effectText: "科技点总产出 +10%，科技点上限 +40",
    productionMultiplier: {
      "res.core.topic_points": 0.1,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 40,
    },
  },
  {
    id: "bld.acad.professor",
    name: "教授",
    description: "中级导师建筑，进一步扩大科研体系承载力。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.junior_faculty": 2,
      },
      techs: ["tech.acad.grad_admissions"],
    },
    cost: {
      "res.core.topic_points": 30,
      "res.core.project_points": 18,
    },
    effectText: "科技点总产出 +18%，科技点上限 +90",
    productionMultiplier: {
      "res.core.topic_points": 0.18,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 90,
    },
  },
  {
    id: "bld.acad.changjiang_scholar",
    name: "长江学者",
    description: "高阶导师建筑，支撑后续更重的学术扩张。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.professor": 1,
      },
      resources: {
        "res.core.topic_points": 60,
        "res.core.project_points": 40,
      },
    },
    cost: {
      "res.core.topic_points": 60,
      "res.core.project_points": 40,
    },
    effectText: "科技点总产出 +32%，科技点上限 +220",
    productionMultiplier: {
      "res.core.topic_points": 0.32,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 220,
    },
  },
];

export const techDefinitions: TechDefinition[] = [
  {
    id: "tech.manual.study_notes",
    name: "精炼笔记",
    description: "手动科研效率提高。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 18,
      "res.core.project_points": 6,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 20,
    },
  },
  {
    id: "tech.manual.side_jobs",
    name: "兼职网络",
    description: "手动打工效率提高。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 6,
      "res.core.project_points": 18,
    },
    resourceLimitBonus: {
      "res.core.project_points": 20,
    },
  },
  {
    id: "tech.acad.grad_admissions",
    name: "研究生招生",
    description: "开放研究生沉淀与更高阶导师建筑。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.junior_faculty": 1,
      },
      resources: {
        "res.core.topic_points": 16,
      },
    },
    cost: {
      "res.core.topic_points": 24,
      "res.core.project_points": 12,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 30,
      "res.core.undergraduates": 4,
    },
  },
  {
    id: "tech.ops.process_management",
    name: "流程管理",
    description: "解锁更高阶的安置与工业组织能力。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.org.admin_office": 1,
      },
      jobs: {
        "job.ops.staff": 2,
      },
    },
    cost: {
      "res.core.topic_points": 14,
      "res.core.project_points": 24,
    },
    resourceLimitBonus: {
      "res.core.project_points": 60,
    },
  },
];

export const startingState = {
  resources: {
    "res.core.undergraduates": 0,
    "res.core.topic_points": 0,
    "res.core.project_points": 0,
    "res.future.space_points": 0,
  } satisfies Record<ResourceId, number>,
  jobs: {
    "job.ops.staff": 0,
    "job.acad.research_grad": 0,
  } satisfies Record<JobId, number>,
  buildings: {
    "bld.source.university": 1,
    "bld.capacity.dorm": 0,
    "bld.capacity.apartment": 0,
    "bld.life.cafeteria": 0,
    "bld.org.admin_office": 0,
    "bld.acad.junior_faculty": 0,
    "bld.acad.professor": 0,
    "bld.acad.changjiang_scholar": 0,
  } satisfies Record<BuildingId, number>,
  techs: {
    "tech.manual.study_notes": false,
    "tech.manual.side_jobs": false,
    "tech.acad.grad_admissions": false,
    "tech.ops.process_management": false,
  } satisfies Record<TechId, boolean>,
} as const;
