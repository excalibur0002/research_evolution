# Research Evolution Project Rules

## Purpose

This document is for AI collaborators working inside this repository. It defines the top-level project structure, the intended responsibility of each directory, and the expected role of the first batch of files in the game project.

The repository is organized around three parallel directories:

```text
research_evolution/
├─ revo/
├─ work/
└─ agents/
```

The project goal is a lightweight browser incremental/idle game inspired by text-forward builders such as Kittens Game. Most gameplay runs entirely in the frontend. The server is only responsible for delivering static files such as HTML, CSS, JavaScript, and basic icon assets.

## Current Game Design Direction

The current design direction is intentionally influenced by the structural logic of Kittens Game, while using an original academic-industrial theme.

Important design rules:

- The game should be text-first and panel-based, not art-heavy.
- Layout should follow a Kittens Game-like information structure:
  - a thin top banner for save/settings/meta controls
  - a left sidebar for always-visible core resources and production rates
  - a right main column for actions, unit management, buildings, and research
  - a bottom log area instead of a right-side log column
- The project should learn from Kittens Game's structure, pacing, unlock layering, and resource tension, but not copy its theme or content directly.

## Engineering Rules For Content Data

The project should be implemented in a data-driven way.

Required principles:

- Use stable ids in code, saves, formulas, and unlock logic.
- Do not use display names as logic keys.
- Keep display text separate from internal ids so the content can be renamed or translated later.
- Prefer hierarchical ids whenever practical.

Examples of the intended pattern:

- resources: `res.core.undergraduates`, `res.core.research`
- jobs: `job.ops.staff`, `job.acad.masters`
- buildings: `bld.source.university`, `bld.org.admin_office`
- techs: `tech.manual.study_notes`, `tech.ops.experimental_fabrication`

Implementation guidance:

- Definitions should live in config tables under `revo/src/data/`
- UI should render human-readable names from those definitions
- Core logic should read ids and data fields, not hard-coded labels
- Future localization should only require replacing display text, not gameplay logic

## Current Resource And Progression Rules

The current thematic model is darker and more abstract than a normal city-builder.

### Core Concept

`Undergraduates` are not currently treated as ordinary population. They are a foundational renewable resource, analogous to a base biological/economic input in a Kittens Game-style loop.

This means:

- Undergraduates should be modeled as a core resource pool
- Universities should be modeled as the main early production building for undergraduates
- Higher systems should consume, transform, or organize undergraduates

### Resource Roles

Current intended resource structure:

- `undergraduates` or the equivalent student-base resource: foundational renewable resource
- `research`: scientific output resource
- `engineering`: applied industrial output resource
- `space`: later-stage exploration resource placeholder

### Building And System Roles

The project should avoid turning every concept into a person-unit.

Current direction:

- `University` is a production building that generates undergraduates
- `Staff` are functional industrial units produced from the undergraduate resource pool
- `Master's students` may function as advanced academic units produced from the same pool
- `Managers` should be treated more like an organizational building/system than a free-standing population class
- `Mentors` or `advisor` structures should also be treated more like buildings, institutions, or academic infrastructure than simple headcount units

### Tension And Constraint Design

The design should emphasize interlocking bottlenecks.

Preferred tension patterns:

- the undergraduate resource pool must be shared between academic and industrial growth
- key buildings should usually cost both research and engineering
- industrial scale should be constrained by management capacity or equivalent organizational support
- academic growth should be constrained by mentor/advisor capacity or equivalent academic infrastructure
- the player should repeatedly face tradeoffs between feeding science, feeding industry, or expanding the source of undergraduates itself

### Long-Term Direction

The early and mid game should establish a clear ladder:

- expand universities
- generate more undergraduates
- channel them into industrial and academic systems
- use research and engineering together to unlock higher-order institutions
- eventually transition toward space or orbital systems

AI collaborators should preserve this progression logic when adding content, renaming systems, or rebalancing data.

## Local Development Environment

The local development environment for this repository is based on Node.js on macOS.

Approved baseline:

- Node.js managed with `fnm`
- Package manager: `npm`
- Frontend toolchain: `Vite + TypeScript`

Environment notes for AI collaborators:

- Do not assume `conda` is part of the intended workflow for this project.
- Do not introduce Python environment setup unless the user explicitly requests Python-based tooling.
- Prefer standard Node project commands such as `npm install`, `npm run dev`, and `npm run build`.
- Keep the toolchain lightweight and avoid adding unnecessary global requirements.

The current repository direction assumes the user will develop locally on a MacBook with this Node-based setup.

## Top-Level Directories

### `revo/`

This is the playable game project. It contains the frontend application, runtime logic, UI rendering, asset references, and build configuration.

Use this directory for:

- Browser game source code
- Static asset references used by the game
- Build and local dev configuration
- Save/load logic
- Game systems such as tick updates, production, unlocks, and purchases

Do not use this directory for:

- Long-form planning documents
- Design notes meant primarily for humans
- Experimental one-off scripts unless they directly support the game build

### `work/`

This is the human-readable working area. It contains planning documents, design notes, balance tables, test scripts, temporary prototypes, and other supporting material that helps develop the game but is not part of the shipped browser build.

Use this directory for:

- Planning and milestone docs
- Gameplay design documents
- Resource and balance spreadsheets or markdown tables
- Notes about unlock pacing, economy tuning, and progression
- Small scripts used to simulate or test formulas
- Draft text, lore, and writing references

### `agents/`

This directory contains project-specific AI collaboration material. It exists to help AI agents work consistently in this repository without re-deriving structure and conventions every turn.

Use this directory for:

- Project rules and architectural notes for AI
- Project-specific skills and prompts
- AI-facing conventions for naming, balancing, save format, and directory responsibilities

## Planned Structure Inside `revo/`

This is the recommended initial shape of the game project:

```text
revo/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ public/
│  └─ icons/
└─ src/
   ├─ main.ts
   ├─ style.css
   ├─ game/
   ├─ data/
   ├─ ui/
   └─ utils/
```

### `revo/index.html`

The HTML shell for the browser game. It should stay minimal and primarily host the root layout container and script entry.

### `revo/package.json`

Defines the frontend project metadata, scripts, and minimal dependencies. The intended stack is lightweight: Vite plus TypeScript, with no heavy frontend framework unless future complexity clearly justifies it.

### `revo/tsconfig.json`

TypeScript compiler settings for the game project.

### `revo/vite.config.ts`

Vite configuration for local development and static production builds.

### `revo/public/icons/`

Small static icons or simple image assets used by the UI. The game is expected to be mostly text-first, so this directory should remain small and focused.

### `revo/src/main.ts`

Frontend entry point. Responsible for bootstrapping the game, creating the initial state, wiring the game loop, loading saves, and triggering the first render.

### `revo/src/style.css`

Global styles for the game UI. Styling should favor a clean text-heavy interface with panels, buttons, resource rows, logs, and small icon support.

## Planned Structure Inside `revo/src/game/`

This area holds runtime gameplay systems and mutable state.

Recommended initial files:

### `revo/src/game/state.ts`

Defines the core game state structure and factory functions for a fresh save. This should include resources, workers, buildings, unlocks, timestamps, and version metadata.

### `revo/src/game/loop.ts`

Defines the main simulation loop. Responsible for tick timing, delta-time handling, and calling production systems on a steady schedule.

### `revo/src/game/save.ts`

Handles local save/load behavior, autosave, export/import, schema versioning, and migration hooks if the save format evolves.

### `revo/src/game/actions.ts`

Contains gameplay actions triggered by the player, such as manual gathering, purchases, job assignment, and technology unlock attempts.

### `revo/src/game/formulas.ts`

Centralizes production formulas, cost scaling, unlock checks, and any other balance-sensitive calculations. Keep formulas here instead of scattering them through UI code.

## Planned Structure Inside `revo/src/data/`

This area contains mostly static design/config data. Prefer data-driven definitions here instead of hardcoding values throughout the runtime systems.

Recommended initial files:

### `revo/src/data/resources.ts`

Definitions for resource ids, names, display order, optional icons, and resource-specific metadata such as caps or visibility rules.

### `revo/src/data/jobs.ts`

Definitions for jobs or worker assignments such as gatherers, woodcutters, or miners, including what they produce and any unlock conditions.

### `revo/src/data/buildings.ts`

Definitions for buildings, costs, scaling rules, production modifiers, and unlock conditions.

### `revo/src/data/techs.ts`

Definitions for upgrades or technologies, including costs, prerequisites, and gameplay effects.

## Planned Structure Inside `revo/src/ui/`

This area contains DOM rendering and interface-specific logic. UI code should read state and produce display output, but avoid owning simulation logic.

Recommended initial files:

### `revo/src/ui/render.ts`

Top-level render coordinator. Responsible for drawing the current game state into the page and refreshing panels when the state changes.

### `revo/src/ui/panels.ts`

Builds resource panels, action buttons, building lists, worker assignment controls, and similar structured UI sections.

### `revo/src/ui/log.ts`

Handles the event log or notification area, such as unlock messages, purchase feedback, or milestone notices.

## Planned Structure Inside `revo/src/utils/`

This area contains pure utility helpers shared by other modules.

Recommended initial files:

### `revo/src/utils/format.ts`

Number and text formatting helpers, such as short number display, resource formatting, and percentage strings.

### `revo/src/utils/time.ts`

Helpers for time conversion, offline duration clamping, timestamp utilities, and readable time labels.

## Planned Structure Inside `work/`

Recommended subdirectories:

```text
work/
├─ planning/
├─ design/
├─ balance/
├─ lore/
├─ tests/
└─ notes/
```

### `work/planning/`

High-level project planning, roadmap, MVP scope, milestones, and delivery sequencing.

### `work/design/`

Gameplay/system design docs, UI layout notes, unlock flow descriptions, and feature proposals.

### `work/balance/`

Economy tables, building costs, production rates, progression curves, and balancing experiments.

### `work/lore/`

Narrative tone, faction notes, worldbuilding, item descriptions, and flavor text.

### `work/tests/`

Small scripts and scratch prototypes used to validate formulas or progression assumptions. These are support tools, not shipped runtime code.

### `work/notes/`

Loose notes, captured ideas, temporary decisions, and short-form working records.

## Planned Structure Inside `agents/`

Recommended future additions:

```text
agents/
├─ project_rules.md
├─ skills/
└─ prompts/
```

### `agents/project_rules.md`

This file. It should remain the first place an AI collaborator checks to understand repository structure and project conventions.

### `agents/skills/`

Project-specific AI skills. Examples may include:

- A balance-tuning assistant skill
- A content-authoring skill for buildings, jobs, and techs
- A frontend cleanup skill tuned to this repository's lightweight DOM-first approach

Current skill file:

- `/Users/floretli/Projects/research_evolution/agents/skills/game_design_skill.md`
  - concept-first design guidance
  - no hardcoded numeric truth inside the skill
  - numeric truth remains in `revo/src/data/game-config.ts`

### `agents/prompts/`

Reusable project prompts for specialized work modes, such as:

- Economy review
- Save schema review
- Text polishing
- Release checklist generation

## Working Principles For AI Collaborators

- Keep the game lightweight and static-host friendly.
- Prefer TypeScript plus native DOM APIs over adding framework complexity unless clearly needed.
- Keep gameplay systems data-driven.
- Do not mix simulation logic directly into UI rendering code.
- Keep balance formulas centralized and easy to inspect.
- Favor text-first UI with optional small icon support.
- Treat `work/` as the human planning space and `revo/` as the shipped product space.
- Add new files only when they have a clear responsibility.

## Near-Term Build Direction

The intended first implementation is:

- A lightweight Vite + TypeScript frontend
- A text-forward interface
- Frontend-only simulation and save handling
- Minimal art requirements
- Clear separation between data definitions, game systems, and UI rendering

AI collaborators should preserve this bias toward simplicity unless the user explicitly asks for a heavier framework or more complex asset pipeline.
