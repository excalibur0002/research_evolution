export type ResourceId =
  | "res.core.undergraduates"
  | "res.core.topic_points"
  | "res.core.project_points"
  | "res.acad.innovation_points"
  | "res.ops.granule_points"
  | "res.ops.leverage_points"
  | "res.ops.momentum_points"
  | "res.ops.matrix_points"
  | "res.acad.top_journal_points"
  | "res.acad.youth_fund_points"
  | "res.acad.general_fund_points"
  | "res.frontier.life.strain_points"
  | "res.frontier.life.variant_points"
  | "res.frontier.evidence_points";

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
  | "bld.capacity.talent_community"
  | "bld.acad.research_group"
  | "bld.life.cafeteria"
  | "bld.org.admin_office"
  | "bld.ops.delivery_desk"
  | "bld.ops.granule_workshop"
  | "bld.ops.leverage_warehouse"
  | "bld.ops.growth_desk"
  | "bld.ops.matrix_lab"
  | "bld.conv.training_center"
  | "bld.conv.advisor_group"
  | "bld.acad.junior_faculty"
  | "bld.acad.manuscript_workshop"
  | "bld.acad.youth_fund_platform"
  | "bld.acad.general_fund_center"
  | "bld.acad.professor"
  | "bld.acad.changjiang_scholar"
  | "bld.cross.interdisciplinary_platform"
  | "bld.frontier.life.sample_center"
  | "bld.frontier.life.continuous_culture_chamber"
  | "bld.frontier.life.multiomics_platform"
  | "bld.frontier.life.phenotype_screening_station"
  | "bld.frontier.life.directed_evolution_bench";

export type TechId =
  | "tech.manual.study_notes"
  | "tech.manual.side_jobs"
  | "tech.acad.grad_admissions"
  | "tech.cross.reemployment_channel"
  | "tech.cross.inservice_upskill_channel"
  | "tech.ops.process_management"
  | "tech.acad.peer_review"
  | "tech.ops.lab_compliance"
  | "tech.cross.incubator"
  | "tech.cross.frontier_initiative"
  | "tech.frontier.life.ethical_sample_access"
  | "tech.frontier.life.high_throughput_sequencing"
  | "tech.frontier.life.co_culture_model"
  | "tech.frontier.life.directed_evolution_protocol"
  | "tech.frontier.life.exogenous_lineage_alignment";

type CountMap<T extends string> = Partial<Record<T, number>>;

export type UnlockRequirement = {
  resources?: CountMap<ResourceId>;
  jobs?: CountMap<JobId>;
  buildings?: CountMap<BuildingId>;
  techs?: TechId[];
  minCycle?: number;
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
  costScaling?: number;
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
    outputResources?: CountMap<ResourceId>;
    outputJobs?: CountMap<JobId>;
  };
};

export type TechDefinition = {
  id: TechId;
  name: string;
  description: string;
  effectText: string;
  unlockedFromStart: boolean;
  unlockWhen?: UnlockRequirement;
  exclusiveGroup?: string;
  cost: CountMap<ResourceId>;
  jobCost?: CountMap<JobId>;
  resourceLimitBonus?: CountMap<ResourceId>;
  productionMultiplier?: CountMap<ResourceId>;
};

export const baseHeadcountLimit = 2;

export const offlineProgressConfig = {
  enabled: true,
  rate: 0.5,
  maxAwaySeconds: 60 * 60 * 12,
  minAwaySecondsForReport: 15,
} as const;

export const resourceDefinitions: ResourceDefinition[] = [
  {
    id: "res.core.undergraduates",
    name: "大学生",
    shortName: "大学生",
    description: "校园里最活跃的人群，总会被不同去处悄悄分走。",
    visibleFromStart: true,
    baseLimit: 120,
  },
  {
    id: "res.core.topic_points",
    name: "课题",
    shortName: "课题",
    description: "从会议室、实验台和邮件附件里慢慢长出来的问题。",
    visibleFromStart: true,
    baseLimit: 80,
  },
  {
    id: "res.core.project_points",
    name: "工单",
    shortName: "工单",
    description: "能被立刻推进、催办和回收的事情。",
    visibleFromStart: true,
    baseLimit: 80,
  },
  {
    id: "res.acad.innovation_points",
    name: "因子",
    shortName: "因子",
    description: "写进 SCI 之后，最先被拿出来比较的往往就是这个数字。",
    visibleFromStart: false,
    baseLimit: 20,
  },
  {
    id: "res.ops.granule_points",
    name: "颗粒",
    shortName: "颗粒",
    description: "被拆得足够细、可以马上动手的小块工作。",
    visibleFromStart: false,
    baseLimit: 30,
  },
  {
    id: "res.ops.leverage_points",
    name: "抓手",
    shortName: "抓手",
    description: "会被一借再借的办法、表格和流程。",
    visibleFromStart: false,
    baseLimit: 20,
  },
  {
    id: "res.ops.momentum_points",
    name: "势能",
    shortName: "势能",
    description: "看不见却能把人往前推的集体惯性。",
    visibleFromStart: false,
    baseLimit: 12,
  },
  {
    id: "res.ops.matrix_points",
    name: "矩阵",
    shortName: "矩阵",
    description: "多线协作终于不再互相打架时留下来的痕迹。",
    visibleFromStart: false,
    baseLimit: 8,
  },
  {
    id: "res.acad.top_journal_points",
    name: "顶刊",
    shortName: "顶刊",
    description: "圈里圈外都很愿意拿出来说嘴的成果。",
    visibleFromStart: false,
    baseLimit: 16,
  },
  {
    id: "res.acad.youth_fund_points",
    name: "青基",
    shortName: "青基",
    description: "足以让年轻老师抬头挺胸一阵子的项目凭据。",
    visibleFromStart: false,
    baseLimit: 10,
  },
  {
    id: "res.acad.general_fund_points",
    name: "面上",
    shortName: "面上",
    description: "更稳、更重，也更像真正入场券的项目资源。",
    visibleFromStart: false,
    baseLimit: 6,
  },
  {
    id: "res.frontier.life.strain_points",
    name: "菌株",
    shortName: "菌株",
    description: "培养皿里先站稳脚跟的那一批，往往也是后续所有麻烦的起点。",
    visibleFromStart: false,
    baseLimit: 40,
  },
  {
    id: "res.frontier.life.variant_points",
    name: "变异株",
    shortName: "变异株",
    description: "偶尔会长歪，却总让人舍不得立刻处理掉的那种结果。",
    visibleFromStart: false,
    baseLimit: 4,
  },
  {
    id: "res.frontier.evidence_points",
    name: "旁证",
    shortName: "旁证",
    description: "实验总有失败，别灰心，努力并不总是无效的。",
    visibleFromStart: false,
    baseLimit: 60,
  },
];

export const manualActionDefinitions: ManualActionDefinition[] = [
  {
    id: "act.manual.study",
    label: "学习",
    targetResourceId: "res.core.undergraduates",
    unlockedFromStart: true,
    baseYield: 0.08,
    boostedYield: 0.14,
    boostTechId: "tech.manual.study_notes",
    logLabel: "学习",
  },
  {
    id: "act.manual.work",
    label: "打工",
    targetResourceId: "res.core.project_points",
    unlockedFromStart: false,
    unlockWhen: {
      resources: {
        "res.core.undergraduates": 10,
      },
    },
    baseYield: 0.45,
    boostedYield: 0.75,
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
        "res.core.project_points": 20,
      },
    },
    baseYield: 0.4,
    boostedYield: 0.65,
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
    description: "从工业界过来的人，习惯先把东西做出来，再慢慢解释给其他人听。",
    actionLabel: "沉淀",
    releaseLabel: "毕业",
    unlockedFromStart: true,
    cost: {
      "res.core.undergraduates": 12,
    },
    producesPerSecond: {
      "res.core.project_points": 0.2,
    },
    headcountCost: 1,
  },
  {
    id: "job.acad.research_grad",
    name: "研究生",
    description: "总在实验室、办公室和群聊之间来回穿梭的人。",
    actionLabel: "沉淀",
    releaseLabel: "回家",
    unlockedFromStart: true,
    cost: {
      "res.core.undergraduates": 18,
    },
    producesPerSecond: {
      "res.core.topic_points": 0.32,
      "res.acad.innovation_points": 0.03,
    },
    headcountCost: 1,
  },
];

export const buildingDefinitions: BuildingDefinition[] = [
  {
    id: "bld.source.university",
    name: "大学",
    description: "招生简章、开放日和新生群一转起来，人就会自己往里涌。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 42,
      "res.core.project_points": 42,
    },
    costScaling: 1.48,
    effectText: "大学生 +0.14/秒，大学生上限 +70",
    producesPerSecond: {
      "res.core.undergraduates": 0.14,
    },
    resourceLimitBonus: {
      "res.core.undergraduates": 70,
    },
  },
  {
    id: "bld.capacity.dorm",
    name: "宿舍",
    description: "有床位，人才肯留下来，不然再热闹也只是一阵风。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 28,
      "res.core.project_points": 22,
    },
    costScaling: 1.55,
    effectText: "大学生 +0.05/秒，大学生上限 +80",
    producesPerSecond: {
      "res.core.undergraduates": 0.05,
    },
    resourceLimitBonus: {
      "res.core.undergraduates": 80,
    },
  },
  {
    id: "bld.capacity.apartment",
    name: "公寓",
    description: "住得像回事以后，留下来做事的人就会多起来。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 80,
      "res.core.project_points": 80,
    },
    costScaling: 1.72,
    effectText: "大学生 +0.05/秒，编制 +5",
    producesPerSecond: {
      "res.core.undergraduates": 0.05,
    },
    headcountBonus: 5,
  },
  {
    id: "bld.capacity.talent_community",
    name: "人才社区",
    description: "配套做得够体面，来的人就更像真的会久住。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.capacity.apartment": 3,
      },
      techs: ["tech.cross.incubator"],
    },
    cost: {
      "res.core.topic_points": 120,
      "res.core.project_points": 120,
      "res.acad.innovation_points": 48,
      "res.acad.general_fund_points": 2,
    },
    costScaling: 1.74,
    effectText: "大学生 +0.08/秒，编制 +5",
    producesPerSecond: {
      "res.core.undergraduates": 0.08,
    },
    headcountBonus: 5,
  },
  {
    id: "bld.acad.research_group",
    name: "课题组",
    description: "牌子一挂上，人和题目都会开始往这边聚。",
    unlockedFromStart: false,
    unlockWhen: {
      resources: {
        "res.core.topic_points": 30,
        "res.core.project_points": 30,
      },
    },
    cost: {
      "res.core.topic_points": 50,
      "res.core.project_points": 44,
    },
    costScaling: 1.46,
    effectText: "课题 +0.16/秒，课题上限 +24",
    producesPerSecond: {
      "res.core.topic_points": 0.16,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 24,
    },
  },
  {
    id: "bld.life.cafeteria",
    name: "食堂",
    description: "饭点不断，流动的人就不至于散得太快。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.capacity.dorm": 1,
      },
      resources: {
        "res.core.undergraduates": 35,
      },
    },
    cost: {
      "res.core.topic_points": 36,
      "res.core.project_points": 42,
    },
    costScaling: 1.44,
    effectText: "大学生总产出 +15%",
    productionMultiplier: {
      "res.core.undergraduates": 0.15,
    },
  },
  {
    id: "bld.org.admin_office",
    name: "管理处",
    description: "章、表和电话都归这里，很多事不是从这儿开始，就是在这儿卡住。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.ops.granule_workshop": 1,
      },
      jobs: {
        "job.ops.staff": 2,
      },
    },
    cost: {
      "res.core.topic_points": 95,
      "res.core.project_points": 110,
    },
    costScaling: 1.56,
    effectText: "工单总产出 +8%，工单上限 +40",
    productionMultiplier: {
      "res.core.project_points": 0.08,
    },
    resourceLimitBonus: {
      "res.core.project_points": 40,
    },
  },
  {
    id: "bld.ops.delivery_desk",
    name: "交付台",
    description: "把会上的漂亮话翻成真的有人接手的具体活。",
    unlockedFromStart: false,
    unlockWhen: {
      jobs: {
        "job.ops.staff": 1,
      },
      resources: {
        "res.core.project_points": 60,
      },
    },
    cost: {
      "res.core.topic_points": 70,
      "res.core.project_points": 95,
    },
    costScaling: 1.54,
    effectText: "每16秒消耗2大学生+1课题，产出5工单",
    toggleable: true,
    conversion: {
      cycleSeconds: 16,
      inputResources: {
        "res.core.undergraduates": 2,
        "res.core.topic_points": 1,
      },
      outputResources: {
        "res.core.project_points": 5,
      },
    },
  },
  {
    id: "bld.ops.granule_workshop",
    name: "颗粒工坊",
    description: "再大的活，拆细以后就终于有人敢接了。",
    unlockedFromStart: false,
    unlockWhen: {
      jobs: {
        "job.ops.staff": 1,
      },
      resources: {
        "res.core.project_points": 40,
      },
    },
    cost: {
      "res.core.topic_points": 58,
      "res.core.project_points": 72,
    },
    costScaling: 1.5,
    effectText: "颗粒 +0.14/秒，颗粒上限 +26",
    producesPerSecond: {
      "res.ops.granule_points": 0.14,
    },
    resourceLimitBonus: {
      "res.ops.granule_points": 26,
    },
  },
  {
    id: "bld.ops.leverage_warehouse",
    name: "抓手资料库",
    description: "模板、清单和旧办法，关键时刻总能被翻出来救场。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.ops.granule_workshop": 1,
      },
      jobs: {
        "job.ops.staff": 1,
      },
    },
    cost: {
      "res.core.topic_points": 140,
      "res.core.project_points": 150,
      "res.ops.granule_points": 10,
    },
    costScaling: 1.6,
    effectText: "每16秒消耗2颗粒+1因子，产出1抓手，抓手上限 +10",
    resourceLimitBonus: {
      "res.ops.leverage_points": 10,
    },
    toggleable: true,
    conversion: {
      cycleSeconds: 16,
      inputResources: {
        "res.ops.granule_points": 2,
        "res.acad.innovation_points": 1,
      },
      outputResources: {
        "res.ops.leverage_points": 1,
      },
    },
  },
  {
    id: "bld.ops.growth_desk",
    name: "增长攻关小组",
    description: "专门盯着那些卡住又不能不推进的硬骨头。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.ops.leverage_warehouse": 1,
      },
      resources: {
        "res.ops.leverage_points": 2,
      },
    },
    cost: {
      "res.core.topic_points": 260,
      "res.core.project_points": 340,
      "res.ops.leverage_points": 12,
    },
    costScaling: 1.7,
    effectText: "每22秒消耗2抓手，产出1势能，势能上限 +8",
    resourceLimitBonus: {
      "res.ops.momentum_points": 8,
    },
    toggleable: true,
    conversion: {
      cycleSeconds: 22,
      inputResources: {
        "res.ops.leverage_points": 2,
      },
      outputResources: {
        "res.ops.momentum_points": 1,
      },
    },
  },
  {
    id: "bld.ops.matrix_lab",
    name: "矩阵室",
    description: "几拨人一旦开始共用同一套表格，事情就会变复杂，也更能成事。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.ops.growth_desk": 1,
      },
      resources: {
        "res.ops.momentum_points": 2,
      },
    },
    cost: {
      "res.core.topic_points": 420,
      "res.core.project_points": 520,
      "res.ops.momentum_points": 14,
      "res.ops.leverage_points": 6,
    },
    costScaling: 1.75,
    effectText: "每32秒消耗3势能，产出1矩阵，矩阵上限 +5",
    resourceLimitBonus: {
      "res.ops.matrix_points": 5,
    },
    toggleable: true,
    conversion: {
      cycleSeconds: 32,
      inputResources: {
        "res.ops.momentum_points": 3,
      },
      outputResources: {
        "res.ops.matrix_points": 1,
      },
    },
  },
  {
    id: "bld.conv.training_center",
    name: "实训中心",
    description: "本来只是来练练手，练久了往往就成了骨干。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.ops.granule_workshop": 1,
      },
      jobs: {
        "job.ops.staff": 2,
      },
    },
    cost: {
      "res.core.topic_points": 130,
      "res.core.project_points": 160,
    },
    costScaling: 1.7,
    effectText: "每30秒消耗4大学生，留下1职员",
    toggleable: true,
    conversion: {
      cycleSeconds: 30,
      inputResources: {
        "res.core.undergraduates": 4,
      },
      outputJobs: {
        "job.ops.staff": 1,
      },
    },
  },
  {
    id: "bld.conv.advisor_group",
    name: "学术夏令营",
    description: "开营时都说只是短住，散营时总有人已经决定留下。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.junior_faculty": 1,
      },
    },
    cost: {
      "res.core.topic_points": 180,
      "res.core.project_points": 130,
    },
    costScaling: 1.72,
    effectText: "每42秒消耗9大学生+2课题，留下1研究生",
    toggleable: true,
    conversion: {
      cycleSeconds: 42,
      inputResources: {
        "res.core.undergraduates": 9,
        "res.core.topic_points": 2,
      },
      outputJobs: {
        "job.acad.research_grad": 1,
      },
    },
  },
  {
    id: "bld.acad.junior_faculty",
    name: "青椒",
    description: "年轻老师最擅长在有限条件下把事情越做越大。",
    unlockedFromStart: true,
    cost: {
      "res.core.topic_points": 28,
      "res.core.project_points": 18,
    },
    costScaling: 1.5,
    effectText: "课题与因子总产出 +10%，课题上限 +40，因子上限 +12",
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
    id: "bld.acad.manuscript_workshop",
    name: "稿件工坊",
    description: "把零碎结果磨到像样，直到足够拿出去见人。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.ops.leverage_warehouse": 1,
      },
      resources: {
        "res.acad.innovation_points": 8,
      },
    },
    cost: {
      "res.core.topic_points": 220,
      "res.core.project_points": 200,
      "res.acad.innovation_points": 24,
    },
    costScaling: 1.68,
    effectText: "每20秒消耗2因子+1抓手，产出1顶刊，顶刊上限 +8",
    resourceLimitBonus: {
      "res.acad.top_journal_points": 8,
    },
    toggleable: true,
    conversion: {
      cycleSeconds: 20,
      inputResources: {
        "res.acad.innovation_points": 2,
        "res.ops.leverage_points": 1,
      },
      outputResources: {
        "res.acad.top_journal_points": 1,
      },
    },
  },
  {
    id: "bld.acad.youth_fund_platform",
    name: "青基平台",
    description: "履历和结果一旦够像样，申请书就会在这里越堆越高。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.manuscript_workshop": 1,
        "bld.ops.growth_desk": 1,
      },
    },
    cost: {
      "res.core.topic_points": 320,
      "res.core.project_points": 260,
      "res.acad.top_journal_points": 10,
      "res.ops.momentum_points": 6,
    },
    costScaling: 1.72,
    effectText: "每28秒消耗1顶刊+1势能，产出1青基，青基上限 +6",
    resourceLimitBonus: {
      "res.acad.youth_fund_points": 6,
    },
    toggleable: true,
    conversion: {
      cycleSeconds: 28,
      inputResources: {
        "res.acad.top_journal_points": 1,
        "res.ops.momentum_points": 1,
      },
      outputResources: {
        "res.acad.youth_fund_points": 1,
      },
    },
  },
  {
    id: "bld.acad.general_fund_center",
    name: "面上中心",
    description: "再往上一层，项目开始有了门槛、体面和专门的说法。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.youth_fund_platform": 1,
        "bld.ops.matrix_lab": 1,
      },
    },
    cost: {
      "res.core.topic_points": 500,
      "res.core.project_points": 420,
      "res.acad.youth_fund_points": 12,
      "res.ops.matrix_points": 4,
    },
    costScaling: 1.77,
    effectText: "每30秒消耗2青基+1矩阵，产出1面上，面上上限 +4",
    resourceLimitBonus: {
      "res.acad.general_fund_points": 4,
    },
    toggleable: true,
    conversion: {
      cycleSeconds: 30,
      inputResources: {
        "res.acad.youth_fund_points": 2,
        "res.ops.matrix_points": 1,
      },
      outputResources: {
        "res.acad.general_fund_points": 1,
      },
    },
  },
  {
    id: "bld.acad.professor",
    name: "教授",
    description: "招牌一稳，很多门就会自己开。",
    unlockedFromStart: false,
    unlockWhen: {
      buildings: {
        "bld.acad.junior_faculty": 2,
      },
      techs: ["tech.acad.grad_admissions"],
    },
    cost: {
      "res.core.topic_points": 80,
      "res.core.project_points": 50,
    },
    costScaling: 1.62,
    effectText: "课题与因子总产出 +18%，课题上限 +90，因子上限 +28",
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
    description: "名字挂上去以后，连场面都会变得正式一点。",
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
      "res.core.topic_points": 180,
      "res.core.project_points": 120,
    },
    costScaling: 1.75,
    effectText: "课题与因子总产出 +32%，课题上限 +220，因子上限 +65",
    productionMultiplier: {
      "res.core.topic_points": 0.32,
      "res.acad.innovation_points": 0.32,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 220,
      "res.acad.innovation_points": 65,
    },
  },
  {
    id: "bld.cross.interdisciplinary_platform",
    name: "跨学科平台",
    description: "终于有人肯把两边的话翻译成彼此都听得懂的样子。",
    unlockedFromStart: false,
    unlockWhen: {
      resources: {
        "res.acad.top_journal_points": 2,
        "res.ops.leverage_points": 2,
      },
    },
    cost: {
      "res.core.topic_points": 360,
      "res.core.project_points": 360,
      "res.acad.innovation_points": 40,
      "res.ops.granule_points": 12,
    },
    costScaling: 1.68,
    effectText: "顶刊/抓手/青基/势能总产出 +12%",
    productionMultiplier: {
      "res.acad.top_journal_points": 0.12,
      "res.ops.leverage_points": 0.12,
      "res.acad.youth_fund_points": 0.12,
      "res.ops.momentum_points": 0.12,
    },
  },
  {
    id: "bld.frontier.life.sample_center",
    name: "样本中心",
    description: "冰箱、编号和签收都在这里，样本先被管住，故事才好继续。",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      techs: ["tech.frontier.life.ethical_sample_access"],
    },
    cost: {
      "res.acad.top_journal_points": 2,
      "res.acad.youth_fund_points": 1,
      "res.ops.leverage_points": 6,
    },
    costScaling: 1.62,
    effectText: "菌株上限 +30，菌株总产出 +8%",
    productionMultiplier: {
      "res.frontier.life.strain_points": 0.08,
    },
    resourceLimitBonus: {
      "res.frontier.life.strain_points": 30,
    },
  },
  {
    id: "bld.frontier.life.continuous_culture_chamber",
    name: "连续培养舱",
    description: "东西一旦开始养，日程表就很难再只按白天写。",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      buildings: {
        "bld.frontier.life.sample_center": 1,
      },
    },
    cost: {
      "res.acad.top_journal_points": 2,
      "res.ops.leverage_points": 8,
      "res.ops.granule_points": 12,
    },
    costScaling: 1.58,
    effectText: "每18秒消耗1顶刊+1抓手，产出5菌株",
    toggleable: true,
    conversion: {
      cycleSeconds: 18,
      inputResources: {
        "res.acad.top_journal_points": 1,
        "res.ops.leverage_points": 1,
      },
      outputResources: {
        "res.frontier.life.strain_points": 5,
      },
    },
  },
  {
    id: "bld.frontier.life.multiomics_platform",
    name: "多组学平台",
    description: "仪器一开，样本就不再只是样本，表格里很快会长出第二层意思。",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      buildings: {
        "bld.frontier.life.sample_center": 1,
      },
      resources: {
        "res.acad.innovation_points": 10,
      },
    },
    cost: {
      "res.acad.top_journal_points": 2,
      "res.acad.youth_fund_points": 1,
      "res.acad.innovation_points": 16,
    },
    costScaling: 1.66,
    effectText: "菌株总产出 +15%",
    productionMultiplier: {
      "res.frontier.life.strain_points": 0.15,
    },
  },
  {
    id: "bld.frontier.life.phenotype_screening_station",
    name: "表型筛选站",
    description: "样本多到一定程度，偶然就会开始排队。",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      buildings: {
        "bld.frontier.life.continuous_culture_chamber": 2,
      },
      resources: {
        "res.frontier.life.strain_points": 30,
      },
    },
    cost: {
      "res.frontier.life.strain_points": 24,
      "res.ops.granule_points": 8,
      "res.ops.leverage_points": 6,
    },
    costScaling: 1.64,
    effectText: "低阶发现额外产出旁证，变异株命中率 +0.3%",
  },
  {
    id: "bld.frontier.life.directed_evolution_bench",
    name: "定向进化台",
    description: "把少见的结果反复逼问，总会问出点新东西。",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      buildings: {
        "bld.frontier.life.phenotype_screening_station": 1,
      },
      resources: {
        "res.frontier.life.variant_points": 1,
      },
    },
    cost: {
      "res.frontier.life.strain_points": 40,
      "res.frontier.life.variant_points": 1,
      "res.acad.innovation_points": 12,
      "res.acad.youth_fund_points": 1,
    },
    costScaling: 1.72,
    effectText: "保底立项阈值 -2",
  },
];

export const techDefinitions: TechDefinition[] = [
  {
    id: "tech.manual.study_notes",
    name: "文献检索规范",
    description: "终于有人把资料找齐、编号，并且真的发到了群里。",
    effectText: "学习产出提升，大学生上限 +40",
    unlockedFromStart: true,
    cost: {
      "res.core.undergraduates": 26,
    },
    resourceLimitBonus: {
      "res.core.undergraduates": 40,
    },
  },
  {
    id: "tech.manual.side_jobs",
    name: "临时工手册",
    description: "跑腿、值班、填表和补锅，总该有一本传来传去的小册子。",
    effectText: "打工产出提升，工单上限 +25",
    unlockedFromStart: false,
    unlockWhen: {
      resources: {
        "res.core.project_points": 30,
      },
    },
    cost: {
      "res.core.topic_points": 14,
      "res.core.project_points": 34,
    },
    resourceLimitBonus: {
      "res.core.project_points": 25,
    },
  },
  {
    id: "tech.acad.grad_admissions",
    name: "导师备案与伦理审查",
    description: "名单报上去之后，很多事才算正式开始。",
    effectText: "开放教授，并提升课题上限 +60、因子上限 +30",
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
      "res.core.topic_points": 75,
      "res.core.project_points": 55,
      "res.acad.innovation_points": 24,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 60,
      "res.acad.innovation_points": 30,
    },
  },
  {
    id: "tech.cross.reemployment_channel",
    name: "分流就业通道",
    description: "总有人读着读着，就去了别的去处。",
    effectText: "开放 2 研究生 -> 1 职员 的就业分流",
    unlockedFromStart: false,
    exclusiveGroup: "branch.personnel.redeployment",
    unlockWhen: {
      jobs: {
        "job.acad.research_grad": 2,
      },
      resources: {
        "res.core.project_points": 35,
      },
    },
    cost: {
      "res.core.topic_points": 50,
      "res.core.project_points": 70,
    },
  },
  {
    id: "tech.cross.inservice_upskill_channel",
    name: "在职进修通道",
    description: "也总有人干着干着，又想回头读点书。",
    effectText: "开放 2 职员 -> 1 研究生 的在职进修",
    unlockedFromStart: false,
    exclusiveGroup: "branch.personnel.redeployment",
    unlockWhen: {
      jobs: {
        "job.ops.staff": 2,
      },
      resources: {
        "res.core.topic_points": 35,
      },
    },
    cost: {
      "res.core.topic_points": 70,
      "res.core.project_points": 50,
    },
  },
  {
    id: "tech.ops.process_management",
    name: "校企联合课题",
    description: "研究台上的想法一旦接上外面的需求，事情就会突然变大。",
    effectText: "开放实验室SOP，并提升工单上限 +110、因子上限 +35",
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
      "res.core.topic_points": 60,
      "res.core.project_points": 90,
      "res.acad.innovation_points": 30,
    },
    resourceLimitBonus: {
      "res.core.project_points": 110,
      "res.acad.innovation_points": 35,
    },
  },
  {
    id: "tech.acad.peer_review",
    name: "同行评议制度",
    description: "有些话，只有匿名的时候才说得最真。",
    effectText: "提升课题上限 +95、因子上限 +50，并解锁更高阶学术线",
    unlockedFromStart: false,
    unlockWhen: {
      techs: ["tech.acad.grad_admissions"],
      jobs: {
        "job.acad.research_grad": 2,
      },
    },
    cost: {
      "res.core.topic_points": 160,
      "res.core.project_points": 120,
      "res.acad.innovation_points": 70,
    },
    jobCost: {
      "job.acad.research_grad": 1,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 95,
      "res.acad.innovation_points": 50,
    },
  },
  {
    id: "tech.ops.lab_compliance",
    name: "实验室SOP",
    description: "一旦每一步都有标准动作，很多混乱就只能认输。",
    effectText: "提升工单上限 +160、课题上限 +55，并作为成果转化前提",
    unlockedFromStart: false,
    unlockWhen: {
      techs: ["tech.ops.process_management"],
      buildings: {
        "bld.org.admin_office": 2,
      },
    },
    cost: {
      "res.core.topic_points": 130,
      "res.core.project_points": 180,
      "res.acad.innovation_points": 65,
    },
    jobCost: {
      "job.ops.staff": 1,
    },
    resourceLimitBonus: {
      "res.core.project_points": 160,
      "res.core.topic_points": 55,
    },
  },
  {
    id: "tech.cross.incubator",
    name: "成果转化孵化器",
    description: "有些东西一离开论文，就开始学会自己长腿。",
    effectText: "开放人才社区，并提升课题/工单/因子上限",
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
      "res.core.topic_points": 320,
      "res.core.project_points": 300,
      "res.acad.innovation_points": 170,
    },
    jobCost: {
      "job.ops.staff": 2,
      "job.acad.research_grad": 2,
    },
    resourceLimitBonus: {
      "res.core.topic_points": 200,
      "res.core.project_points": 220,
      "res.acad.innovation_points": 90,
    },
  },
  {
    id: "tech.cross.frontier_initiative",
    name: "前沿探索立项",
    description: "当探索被正式写进议程，才会打开未定域的大门。",
    effectText: "解锁未定域，并激活生命课题线",
    unlockedFromStart: false,
    unlockWhen: {
      techs: ["tech.cross.incubator"],
      resources: {
        "res.acad.top_journal_points": 2,
        "res.acad.youth_fund_points": 1,
        "res.ops.leverage_points": 6,
      },
    },
    cost: {
      "res.core.topic_points": 260,
      "res.core.project_points": 240,
      "res.acad.innovation_points": 120,
      "res.ops.matrix_points": 2,
    },
    jobCost: {
      "job.ops.staff": 6,
      "job.acad.research_grad": 6,
    },
  },
  {
    id: "tech.frontier.life.ethical_sample_access",
    name: "伦理样本准入",
    description: "文件批下来以后，门里门外的空气都不一样。",
    effectText: "开放样本中心与生命体系入口",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      resources: {
        "res.acad.top_journal_points": 2,
        "res.acad.youth_fund_points": 1,
        "res.ops.leverage_points": 6,
      },
    },
    cost: {
      "res.acad.top_journal_points": 2,
      "res.acad.youth_fund_points": 1,
      "res.ops.leverage_points": 6,
    },
  },
  {
    id: "tech.frontier.life.high_throughput_sequencing",
    name: "高通量测序流程",
    description: "当样本不再一管一管地看，节奏就会突然变快。",
    effectText: "开放并行破题 x10，菌株总产出 +25%",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      buildings: {
        "bld.frontier.life.sample_center": 1,
      },
      resources: {
        "res.frontier.life.strain_points": 18,
      },
    },
    cost: {
      "res.frontier.life.strain_points": 18,
      "res.acad.innovation_points": 10,
    },
    productionMultiplier: {
      "res.frontier.life.strain_points": 0.25,
    },
  },
  {
    id: "tech.frontier.life.co_culture_model",
    name: "菌群共培养模型",
    description: "把它们放在一起，有时候比单独盯着一个更有意思。",
    effectText: "旁证产出提高，并解锁后续生命课题",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      buildings: {
        "bld.frontier.life.continuous_culture_chamber": 2,
      },
      resources: {
        "res.frontier.life.strain_points": 36,
      },
    },
    cost: {
      "res.frontier.life.strain_points": 30,
      "res.ops.leverage_points": 6,
      "res.ops.granule_points": 8,
    },
  },
  {
    id: "tech.frontier.life.directed_evolution_protocol",
    name: "定向进化协议",
    description: "好结果不是等来的，是一轮一轮筛出来的。",
    effectText: "提升变异株命中率，并降低保底累计需求",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      buildings: {
        "bld.frontier.life.phenotype_screening_station": 1,
      },
      resources: {
        "res.frontier.life.variant_points": 2,
      },
    },
    cost: {
      "res.frontier.life.variant_points": 2,
      "res.acad.innovation_points": 12,
      "res.acad.youth_fund_points": 1,
    },
  },
  {
    id: "tech.frontier.life.exogenous_lineage_alignment",
    name: "陌生序列比对",
    description: "偶尔会有些不该出现在这里的信号，先别声张。",
    effectText: "开放极低概率的星图掉落",
    unlockedFromStart: false,
    unlockWhen: {
      minCycle: 1,
      techs: ["tech.frontier.life.directed_evolution_protocol"],
      resources: {
        "res.acad.general_fund_points": 1,
        "res.frontier.life.variant_points": 3,
      },
    },
    cost: {
      "res.frontier.life.variant_points": 3,
      "res.acad.general_fund_points": 1,
      "res.acad.top_journal_points": 2,
    },
  },
];

export const startingState = {
  resources: {
    "res.core.undergraduates": 0,
    "res.core.topic_points": 0,
    "res.core.project_points": 0,
    "res.acad.innovation_points": 0,
    "res.ops.granule_points": 0,
    "res.ops.leverage_points": 0,
    "res.ops.momentum_points": 0,
    "res.ops.matrix_points": 0,
    "res.acad.top_journal_points": 0,
    "res.acad.youth_fund_points": 0,
    "res.acad.general_fund_points": 0,
    "res.frontier.life.strain_points": 0,
    "res.frontier.life.variant_points": 0,
    "res.frontier.evidence_points": 0,
  } satisfies Record<ResourceId, number>,
  jobs: {
    "job.ops.staff": 0,
    "job.acad.research_grad": 0,
  } satisfies Record<JobId, number>,
  buildings: {
    "bld.source.university": 1,
    "bld.capacity.dorm": 0,
    "bld.capacity.apartment": 0,
    "bld.capacity.talent_community": 0,
    "bld.acad.research_group": 0,
    "bld.life.cafeteria": 0,
    "bld.org.admin_office": 0,
    "bld.ops.delivery_desk": 0,
    "bld.ops.granule_workshop": 0,
    "bld.ops.leverage_warehouse": 0,
    "bld.ops.growth_desk": 0,
    "bld.ops.matrix_lab": 0,
    "bld.conv.training_center": 0,
    "bld.conv.advisor_group": 0,
    "bld.acad.junior_faculty": 0,
    "bld.acad.manuscript_workshop": 0,
    "bld.acad.youth_fund_platform": 0,
    "bld.acad.general_fund_center": 0,
    "bld.acad.professor": 0,
    "bld.acad.changjiang_scholar": 0,
    "bld.cross.interdisciplinary_platform": 0,
    "bld.frontier.life.sample_center": 0,
    "bld.frontier.life.continuous_culture_chamber": 0,
    "bld.frontier.life.multiomics_platform": 0,
    "bld.frontier.life.phenotype_screening_station": 0,
    "bld.frontier.life.directed_evolution_bench": 0,
  } satisfies Record<BuildingId, number>,
  techs: {
    "tech.manual.study_notes": false,
    "tech.manual.side_jobs": false,
    "tech.acad.grad_admissions": false,
    "tech.cross.reemployment_channel": false,
    "tech.cross.inservice_upskill_channel": false,
    "tech.ops.process_management": false,
    "tech.acad.peer_review": false,
    "tech.ops.lab_compliance": false,
    "tech.cross.incubator": false,
    "tech.cross.frontier_initiative": false,
    "tech.frontier.life.ethical_sample_access": false,
    "tech.frontier.life.high_throughput_sequencing": false,
    "tech.frontier.life.co_culture_model": false,
    "tech.frontier.life.directed_evolution_protocol": false,
    "tech.frontier.life.exogenous_lineage_alignment": false,
  } satisfies Record<TechId, boolean>,
} as const;
