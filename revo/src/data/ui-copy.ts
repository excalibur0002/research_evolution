export type ModeCopy = {
  dev: string;
  player: string;
};

export const uiCopy = {
  tabs: {
    ariaLabel: "主标签页",
    campus: "城市",
    frontier: "未定域",
  },
  sidebar: {
    resources: {
      title: "资源",
      description: {
        dev: "悬停可查看资源说明，显示格式为 当前/上限 与 每秒变化。",
        player: "眼下能调动的东西，都在这里。",
      } satisfies ModeCopy,
    },
  },
  saveControls: {
    exportTitle: "导出为不可读存档文本，可跨设备迁移",
    importTitle: "导入之前导出的存档文件，也兼容旧版 JSON 存档",
    hardResetButtonTitle: "这不是学脉觉醒，会自动备份当前存档后直接回到第 1 周目",
  },
  campus: {
    introHeadingDev: "校园系统原型",
    introLead: {
      dev: "大学生、课题和工单共同驱动设施、制度与后续的学脉觉醒。",
      player: "很多事情起初只是为了先把眼前接住。时间久了，临时的安排也会慢慢长出自己的秩序。",
    } satisfies ModeCopy,
    frontierHint: {
      unlocked: {
        dev: "未定域已经开放，晚期资源可以继续向生命体系倾斜。",
        player: "另一条更偏的方向已经出现了，攒下来的成果可以试着往那边送。",
      } satisfies ModeCopy,
      locked: {
        dev: "把顶刊、青基和抓手推起来后，就能准备第一次学脉觉醒。",
        player: "等招牌、项目和办法都攒得像样些，总会迎来学脉觉醒。",
      } satisfies ModeCopy,
    },
    sections: {
      actions: {
        title: "行动",
        description: {
          dev: "按钮会按进度逐步解锁：学习 -> 打工 -> 科研。",
          player: "很多事情都得先自己动手，别人之后才会跟着把它当回事。",
        } satisfies ModeCopy,
      },
      jobs: {
        title: "编制管理",
        description: {
          dev: "把大学生转化为职员或研究生。",
          player: "有人先沉淀下来做事，有人换个方向继续走，名单一长，很多事就有了继续做下去的理由。",
        } satisfies ModeCopy,
      },
      buildings: {
        title: "设施",
        description: {
          dev: "设施负责资源来源、倍率增益与资源上限扩展。",
          player: "地方、流程和人一旦配齐，很多事就不再需要人提醒了。",
        } satisfies ModeCopy,
      },
      techs: {
        title: "制度与项目",
        description: {
          dev: "制度与项目负责手动效率提升和新单位、新设施与中后期入口的解锁。",
          player: "有的管秩序，有的开新门，真正麻烦的是两者一起发生。",
        } satisfies ModeCopy,
      },
    },
  },
  frontier: {
    intro: {
      kicker: "未定域 · 前沿探索",
      headingDev: "把校园后段资源压进未知方向",
      lead: {
        dev: "这里是中后期的资源消耗层，也是多周目的主要动力来源。当前版本先开放生命体系，用于验证首条前沿链路。",
        player: "有人低头整理手里的成果，也总会有人抬头仰望星空。",
      } satisfies ModeCopy,
    },
    summary: {
      title: "前沿摘要",
      description: {
        dev: "学脉与星图会跨周目保留，菌株、变异株与旁证只属于当前周目。",
        player: "学脉和星图带得走，别的发现大多只在这一周目作数。",
      } satisfies ModeCopy,
      cycleLocked: "尚未觉醒",
      lineageTooltip: {
        dev: "学脉会在学脉觉醒后永久保留，并提高后续周目的时间倍率。",
        player: "后面的周目还会认它。",
      } satisfies ModeCopy,
      lineageNote: {
        dev: "永久成长货币",
        player: "后面的周目还会认它",
      } satisfies ModeCopy,
      lineageLabel: "学脉",
      starTooltip: {
        dev: "星图是未定域里的永久稀有发现，当前版本先掉落不消耗。",
        player: "现在还没人说得清它到底拿来做什么。",
      } satisfies ModeCopy,
      starNote: {
        dev: "永久稀有发现",
        player: "用途不明",
      } satisfies ModeCopy,
      strainNote: {
        dev: "生命体系基础资源",
        player: "先在培养皿里站稳脚的那一批",
      } satisfies ModeCopy,
      variantNote: {
        dev: "生命体系稀有资源",
        player: "偶尔会长歪，却越看越舍不得扔",
      } satisfies ModeCopy,
      evidenceNote: {
        dev: "破题补偿货币",
        player: "实验总有失败，别灰心，努力并不总是无效的",
      } satisfies ModeCopy,
    },
    currentDirection: {
      title: "当前方向",
      lockedDescription: {
        dev: "未定域还没完全开启。第一次学脉觉醒后，生命体系会在这里接管中后期玩法。",
        player: "方向还没开到这一步，先把手里的成果攒够再说。",
      } satisfies ModeCopy,
      activeDescription: {
        dev: "当前周目的前沿投入都先汇入生命体系，用菌株、变异株和旁证把本周目推深。",
        player: "从培养皿、样本柜到筛选台，这条线信奉的不是体面，而是反复。只要夜够深，沉默的东西迟早会开口。",
      } satisfies ModeCopy,
      card: {
        tag: "生命体系",
        title: "生命体系",
        body: "培养、筛选、复现，一层层往里推进。这里很少一锤定音，更像是在和不肯说话的东西慢慢讲条件。",
        footer: "灯已经亮了",
      },
    },
    breakthrough: {
      title: "破题会",
      lockedDescription: {
        dev: "未定域仍处于预热阶段。完成第一次学脉觉醒后，生命体系会在这里正式展开。",
        player: "还没轮到这一步，先把手里的成果攒稳。",
      } satisfies ModeCopy,
      activeDescription: {
        dev: "把校园后期资源压进生命方向，换取菌株、变异株，以及极低概率的星图。",
        player: "把攒下来的成果送进去，看看今晚会不会有谁突然不按常理生长。",
      } satisfies ModeCopy,
      actions: {
        single: "破题",
        multi: "并行破题 x10",
        pity: "旁证补档",
        variant: "旁证换株",
      },
      summaryLabels: {
        singleCost: "单次花费",
        multiCost: "并行花费",
        pity: "保底累计",
      },
      singleCostNote: {
        dev: "12菌株 + 1顶刊 + 1抓手",
        player: "先试一题",
      } satisfies ModeCopy,
      multiCostNote: {
        devLocked: "需高通量测序流程",
        devUnlocked: "已开放",
        playerLocked: "先把测序线接起来",
        playerUnlocked: "一起排队试",
      },
      pityNote: {
        player: "越试越会有眉目",
      },
      dropTableTitle: "当前掉落表",
      notes: {
        dev: [
          "旁证补档: 消耗 20 旁证，推进 5 点保底累计。",
          "旁证换株: 消耗 45 旁证，直接换取 1 变异株。",
          "星图以 0.01 为单位极低概率掉落，先囤积，后续版本再开放主要消耗口。",
        ],
        player: [
          "线索够多时，结果会慢慢向你靠拢。",
          "旁证攒久了，也能硬换一点狠货。",
          "星图现在只会偶尔露一点边。",
        ],
      },
      dropLabels: {
        evidence: "旁证",
        strain: "菌株",
        variant: "变异株",
        star: "星图",
      },
    },
    lifeFacilities: {
      title: "生命设施",
      description: {
        dev: "生命体系的设施负责菌株产出、保底压缩和当前周目的深推。",
        player: "这些房间看上去都规规矩矩，真正让人睡不着的部分通常发生在第二天早上。",
      } satisfies ModeCopy,
      empty: "继续推进前段成果，或完成第一次学脉觉醒后，这里会逐步亮起来。",
    },
    lifeProjects: {
      title: "生命课题",
      description: {
        dev: "先开伦理样本准入，再通过高通量、共培养和定向进化逐步放大破题效率。",
        player: "制度一旦接上，很多本来没动静的东西会忽然回你一句。",
      } satisfies ModeCopy,
      empty: "当前还没有可研究的生命体系项目。",
    },
    awakeningPanel: {
      title: "学脉觉醒",
      devLead: "重开会清空大部分本周目进度，但会继承学脉与星图，并让下一周目起步更快。",
      summary: {
        lineageLabel: "本周目学迹",
        lineageNote: "每 10 学迹可转化 1 学脉",
        currentMultiplierLabel: "当前时间倍率",
        currentMultiplierNote: "已计入学脉与星图",
        nextMultiplierLabel: "觉醒后时间倍率",
      },
      sections: {
        lose: "本周目将失去",
        keep: "觉醒后仍保留",
        gain: "本次新增",
      },
      loseItems: [
        "大部分普通资源与高阶校园资源",
        "岗位、设施与常规项目",
        "菌株、变异株、旁证与本周目学迹",
      ],
      keepLabels: {
        lineage: "学脉存量",
        starCharts: "星图",
        cycles: "已完成周目",
      },
      gainLabels: {
        lineage: "学脉增量",
      },
      gainItems: [
        "更高的时间倍率",
        "更高的生命体系稀有命中率",
      ],
      button: "学脉觉醒",
      buttonNoteReady: "这事最好先想清楚再点。",
      buttonNoteBlocked: "继续攒一点像样的成果，门自然会认出你。",
    },
    modals: {
      awakening: {
        title: "确认进行学脉觉醒？",
        description: "这会重开当前周目。当前各线的大部分本周目资源都会被清空，只保留学脉、星图和已完成周目数。",
        loseTitle: "本周目将失去",
        keepTitle: "觉醒后仍保留",
        gainTitle: "本次新增",
        loseItems: [
          "普通资源与高阶校园资源",
          "岗位、设施与制度进度",
          "菌株、变异株、旁证、保底累计与本周目学迹",
        ],
        keepLabels: {
          lineage: "学脉存量",
          starCharts: "星图",
          cycles: "已完成周目",
        },
        gainLabels: {
          lineage: "学脉增量",
          timeMultiplierPrefix: "时间倍率从",
          conversionPrefix: "由学迹转化",
        },
        confirm: "确认觉醒",
        cancel: "再等等",
      },
      hardReset: {
        title: "确认重置全部进度？",
        description: "这不是学脉觉醒。确认后会直接回到第 1 周目，并在重置前自动导出一份当前存档备份。",
        resetTitle: "将被清空",
        backupTitle: "重置前会执行",
        distinctionTitle: "不会替代",
        resetItems: [
          "所有周目、学脉与星图",
          "全部资源、岗位与设施",
          "制度与项目、本地自动存档",
        ],
        backupItems: [
          "自动导出当前存档备份",
          "备份文件为不可读存档文本，可稍后重新导入",
          "导出完成后再清空当前进度",
        ],
        distinctionItems: [
          "这不会结算学脉",
          "这不会保留任何游戏进度",
          "这只是重新开一把",
        ],
        confirm: "导出并重置",
        cancel: "再等等",
      },
    },
    system: {
      unlockTextFirst: "首次觉醒后开放生命体系",
      unlockTextRepeat: "更高周目会继续提高破题效率与稀有率",
      unlockTextBlocked: "继续积累学迹，凑够可转化学脉的分量",
      awakeningLogFirst: "未定域中的生命体系已经苏醒，下一轮可以尝试推进菌株与变异株。",
      awakeningLogRepeat: "新的周目开始了，时间倍率和破题条件都比上一轮更有利。",
    },
  },
  footerLog: {
    title: "进展记录",
    description: {
      dev: "关键动作与解锁提示会在这里滚动显示。",
      player: "最近发生过的事，会在这里留个底。",
    } satisfies ModeCopy,
  },
} as const;

export function formatLifePityNote(threshold: number): string {
  return `空转满 ${threshold} 次后下次必出变异株`;
}

export function formatLifeDropDescription(
  kind: keyof typeof uiCopy.frontier.breakthrough.dropLabels,
  options: {
    evidenceAmount?: number;
    strainAmount?: number;
    evidenceBonus?: number;
    variantAmount?: number;
    starAmount?: number;
  } = {},
): string {
  if (kind === "evidence") {
    return `旁证 x${options.evidenceAmount ?? 0}`;
  }

  if (kind === "strain") {
    const base = `菌株 x${options.strainAmount ?? 0}`;
    return (options.evidenceBonus ?? 0) > 0 ? `${base}，旁证 +${options.evidenceBonus}` : base;
  }

  if (kind === "variant") {
    return `变异株 x${options.variantAmount ?? 1}`;
  }

  return `星图 +${(options.starAmount ?? 0.01).toFixed(2)}`;
}

export function formatAwakeningGainLog(
  studyTraceGain: number,
  lineageGain: number,
  conversionRate: number,
): string {
  return `学脉觉醒完成：${studyTraceGain} 学迹转化为 ${lineageGain} 学脉（${conversionRate}:1）。`;
}
