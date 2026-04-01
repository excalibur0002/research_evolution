# Game Design Skill (Concept-First)

## Purpose

This skill guides AI collaborators on **how to think about design** in this project.
It intentionally avoids fixed numeric balance details. Numeric values, conversion rates, and unlock thresholds must be read from project data files.

## Scope

Use this skill when:

- proposing or reviewing gameplay loops
- adjusting naming, structure, and progression concepts
- implementing mechanics that should remain data-driven
- aligning UI behavior with the design philosophy

Do not use this file as a source of truth for exact values.

## Source Of Truth Rule

All concrete gameplay values must come from:

- `/Users/floretli/Projects/research_evolution/revo/src/data/game-config.ts`

If values are needed, read them from config instead of inventing or hardcoding.

## Core Design Philosophy

1. **Undergraduates are the foundational resource**
- Treat undergraduates as the base renewable input of the entire system.
- Most systems should either generate, consume, or transform this resource.

2. **Sedimentation as transformation**
- Use "沉淀" as the narrative and mechanic for converting base resource into functional units.
- This keeps worldbuilding and mechanics consistent.

3. **Interlocking bottlenecks over linear growth**
- Progress should come from resolving constraints, not single-resource stacking.
- Keep multiple dependencies active (production, unlock, storage caps, and conversion costs).

4. **Resource caps are first-class mechanics**
- Follow the Kittens Game-style pattern: each resource has `current / cap` and `+rate`.
- Cap growth should be driven by buildings and technologies.
- Avoid separate UI complexity if the same information can be expressed as resource caps.

5. **Conceptual clarity over content volume**
- Prefer a small number of clear systems with meaningful tension.
- Add new elements only if they create a new decision or bottleneck.

## Naming And Modeling Rules

1. **IDs drive logic**
- Use stable hierarchical ids in code and data.
- Never use display names as logic keys.

2. **Display text is presentation only**
- Display names and descriptions can change for narrative/localization.
- IDs, structure, and config schema should remain stable.

3. **Theme-consistent naming**
- Keep naming anchored in the academic-industrial narrative.
- New resources/buildings should feel naturally related to the undergraduate-centered world.

## UI Principles

1. **Text-first, dense, readable**
- Keep the interface concise and information-rich.
- Prioritize scanability over decorative UI blocks.

2. **Progressive disclosure**
- Use hover/tooltips for descriptions where possible.
- Keep core panel rows compact (`amount/cap`, `rate`, action buttons).

3. **Left/right/bottom structure**
- Left: always-visible resource state
- Right: actions, unit management, buildings, tech
- Bottom: event log

## Implementation Principles

1. **Config-first mechanics**
- New mechanics should be expressible in data tables whenever possible.
- Logic files should interpret config, not store content decisions.

2. **One action path per mechanic**
- Manual actions, passive production, spending, cap clamping, and unlock checks should each have centralized helpers.

3. **Predictable balancing workflow**
- First adjust concept and dependency shape.
- Then adjust values in config.
- Avoid scattering balance constants in runtime code.

## Collaboration Checklist For AI Agents

Before finalizing design-related changes:

1. Confirm all new numeric values live in `game-config.ts`.
2. Confirm IDs are stable and hierarchical.
3. Confirm UI stays compact and tooltip-friendly.
4. Confirm bottlenecks still create meaningful tradeoffs.
5. Confirm no gameplay rule is hidden in display text.

If any item fails, revise before shipping.
