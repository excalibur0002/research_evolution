export type ResourceId =
  | "res.core.undergraduates"
  | "res.core.topic_points"
  | "res.core.project_points"
  | "res.acad.innovation_points"
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
  | "bld.conv.training_center"
  | "bld.conv.advisor_group"
  | "bld.acad.junior_faculty"
  | "bld.acad.professor"
  | "bld.acad.changjiang_scholar";

export type TechId =
  | "tech.manual.study_notes"
  | "tech.manual.side_jobs"
  | "tech.acad.grad_admissions"
  | "tech.ops.process_management"
  | "tech.acad.peer_review"
  | "tech.ops.lab_compliance"
  | "tech.cross.incubator";

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
  releaseLabel: string;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  cost: CountMap<ResourceId>;
  producesPerSecond: CountMap<ResourceId>;
  headcountCost: number;
};

export type BuildingDefinition = {
  id: BuildingId;
  name: string;
  description: string;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  cost: CountMap<ResourceId>;
  jobCost?: CountMap<JobId>;
  effectText: string;
  producesPerSecond?: CountMap<ResourceId>;
  productionMultiplier?: CountMap<ResourceId>;
  resourceLimitBonus?: CountMap<ResourceId>;
  headcountBonus?: number;
  toggleable?: boolean;
  conversion?: {
    cycleSeconds: number;
    inputResources?: CountMap<ResourceId>;
    inputJobs?: CountMap<JobId>;
    outputJobs: CountMap<JobId>;
  };
};

export type TechDefinition = {
  id: TechId;
  name: string;
  description: string;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  cost: CountMap<ResourceId>;
  jobCost?: CountMap<JobId>;
  resourceLimitBonus?: CountMap<ResourceId>;
};

export const baseHeadcountLimit = 1;

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
    name: "工程点",
    shortName: "工程",
    description: "来自打工、执行与工程组织的推进资源。",
    visibleFromStart: true,
    baseLimit: 80,
  },
  {
    id: "res.acad.innovation_points",
    name: "创新点",
    shortName: "创新",
    description: "来自学术体系的高阶研究资源，用于中后期研究项目。",
    visibleFromStart: false,
    baseLimit: 20,
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
    baseYield: 0.2,
    logLabel: "学习",
  },
  {
    id: "act.manual.work",
    label: "打工",
    targetResourceId: "res.core.project_points",
    unlockedFromStart: false,
    unlockWhen: {
      resources: {
        "res.core.undergraduates": 2,
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
        "job.ops.staff": 1,
      },
      resources: {
        "res.core.project_points": 3,
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
    description: "被沉淀进工程体系的基础执行单位。",
    actionLabel: "沉淀",
    releaseLabel: "解雇",
    unlockedFromStart: true,
    cost: {
      "res.core.undergraduates": 4,
    },
    producesPerSecond: {
      "res.core.project_points": 0.55,
    },
    headcountCost: 1,
  },
  {
    id: "job.acad.research_grad",
    name: "研究生",
    description: "被沉淀进学术体系的核心单位。",
    actionLabel: "沉淀",
    releaseLabel: "毕业",
    unlockedFromStart: true,
    cost: {
      "res.core.undergraduates": 10,
    },
    producesPerSecond: {
      "res.core.topic_points": 0.85,
      "res.acad.innovation_points": 0.03,
    },
    headcountCost: 1,
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
    effectText: "大学生 +0.05/秒，大学生上限 +6",
    producesPerSecond: {
      "res.core.undergraduates": 0.05,
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
    headcountBonus: 2,
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
    headcountBonus: 4,
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
    effectText: "工程点总产出 +8%，工程点上限 +40",
    productionMultiplier: {
      "res.core.project_points": 0.08,
    },
    resourceLimitBonus: {
      "res.core.project_points": 40,
    },
  },
  {
    id: "bld.conv.training_center",
    name: "实训中心",
    description: "把大学生持续沉淀为职员，可根据资源压力临时停机。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 10,
      "res.core.project_points": 12,
    },
    effectText: "每5秒消耗2大学生，沉淀1职员",
    toggleable: true,
    conversion: {
      cycleSeconds: 5,
      inputResources: {
        "res.core.undergraduates": 2,
      },
      outputJobs: {
        "job.ops.staff": 1,
      },
    },
  },
  {
    id: "bld.conv.advisor_group",
    name: "导师组",
    description: "在导师组织下持续沉淀研究生，适合中期学术扩张。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.junior_faculty": 1,
      },
    },
    cost: {
      "res.core.topic_points": 18,
      "res.core.project_points": 12,
    },
    effectText: "每8秒消耗3大学生+1科技点，沉淀1研究生",
    toggleable: true,
    conversion: {
      cycleSeconds: 8,
      inputResources: {
        "res.core.undergraduates": 3,
        "res.core.topic_points": 1,
      },
      outputJobs: {
        "job.acad.research_grad": 1,
      },
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
    effectText: "科技点与创新点总产出 +10%，科技点上限 +40，创新点上限 +12",
    productionMultiplier: {
      "res.core.topic_points": 0.1,
      "res.acad.innovation_points": 0.1,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 40,
      "res.acad.innovation_points": 12,
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
    jobCost: {
      "job.acad.research_grad": 1,
    },
    effectText: "科技点与创新点总产出 +18%，科技点上限 +90，创新点上限 +28",
    productionMultiplier: {
      "res.core.topic_points": 0.18,
      "res.acad.innovation_points": 0.18,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 90,
      "res.acad.innovation_points": 28,
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
    jobCost: {
      "job.ops.staff": 1,
      "job.acad.research_grad": 2,
    },
    effectText: "科技点与创新点总产出 +32%，科技点上限 +220，创新点上限 +65",
    productionMultiplier: {
      "res.core.topic_points": 0.32,
      "res.acad.innovation_points": 0.32,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 220,
      "res.acad.innovation_points": 65,
    },
  },
];

export const techDefinitions: TechDefinition[] = [
  {
    id: "tech.manual.study_notes",
    name: "文献检索规范",
    description: "建立统一检索与摘要流程，提升手动科研效率。",
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
    name: "实验记录模板",
    description: "规范实验与工程记录，提升手动打工效率。",
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
    name: "伦理审查流程",
    description: "建立伦理审查机制，开放高阶学术路线与导师扩展。",
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
      "res.acad.innovation_points": 8,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 30,
      "res.core.undergraduates": 4,
      "res.acad.innovation_points": 18,
    },
  },
  {
    id: "tech.ops.process_management",
    name: "校企联合课题",
    description: "引入校企协同研发机制，强化中后期组织能力。",
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
      "res.acad.innovation_points": 12,
    },
    resourceLimitBonus: {
      "res.core.project_points": 60,
      "res.acad.innovation_points": 20,
    },
  },
  {
    id: "tech.acad.peer_review",
    name: "同行评议制度",
    description: "建立跨院系匿名评议机制，提升课题质量并稳定创新产出。",
    unlockedFromStart: false,
    unlockWhen: {
      techs: ["tech.acad.grad_admissions"],
      jobs: {
        "job.acad.research_grad": 2,
      },
    },
    cost: {
      "res.core.topic_points": 30,
      "res.core.project_points": 18,
      "res.acad.innovation_points": 16,
    },
    jobCost: {
      "job.acad.research_grad": 1,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 45,
      "res.acad.innovation_points": 26,
    },
  },
  {
    id: "tech.ops.lab_compliance",
    name: "实验室合规体系",
    description: "完善采购、安全与责任链流程，强化工程执行稳定性。",
    unlockedFromStart: false,
    unlockWhen: {
      techs: ["tech.ops.process_management"],
      buildings: {
        "bld.org.admin_office": 2,
      },
    },
    cost: {
      "res.core.topic_points": 20,
      "res.core.project_points": 36,
      "res.acad.innovation_points": 14,
    },
    jobCost: {
      "job.ops.staff": 1,
    },
    resourceLimitBonus: {
      "res.core.project_points": 85,
      "res.core.topic_points": 20,
    },
  },
  {
    id: "tech.cross.incubator",
    name: "成果转化孵化器",
    description: "建立校内孵化与企业导师协同，让学术与工程形成闭环。",
    unlockedFromStart: false,
    unlockWhen: {
      techs: ["tech.acad.peer_review", "tech.ops.lab_compliance"],
      buildings: {
        "bld.acad.professor": 1,
      },
      jobs: {
        "job.ops.staff": 4,
        "job.acad.research_grad": 3,
      },
    },
    cost: {
      "res.core.topic_points": 55,
      "res.core.project_points": 55,
      "res.acad.innovation_points": 30,
    },
    jobCost: {
      "job.ops.staff": 2,
      "job.acad.research_grad": 2,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 110,
      "res.core.project_points": 120,
      "res.acad.innovation_points": 45,
      "res.core.undergraduates": 10,
    },
  },
];

export const startingState = {
  resources: {
    "res.core.undergraduates": 0,
    "res.core.topic_points": 0,
    "res.core.project_points": 0,
    "res.acad.innovation_points": 0,
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
    "bld.conv.training_center": 0,
    "bld.conv.advisor_group": 0,
    "bld.acad.junior_faculty": 0,
    "bld.acad.professor": 0,
    "bld.acad.changjiang_scholar": 0,
  } satisfies Record<BuildingId, number>,
  techs: {
    "tech.manual.study_notes": false,
    "tech.manual.side_jobs": false,
    "tech.acad.grad_admissions": false,
    "tech.ops.process_management": false,
    "tech.acad.peer_review": false,
    "tech.ops.lab_compliance": false,
    "tech.cross.incubator": false,
  } satisfies Record<TechId, boolean>,
} as const;
