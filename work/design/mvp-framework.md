# Research Evolution MVP Framework

## Core Theme

The early game is a tension between two foundational development tracks:

- Science: represented by research point production
- Engineering: represented by engineering point production

These two tracks should support and constrain each other. The player should not be able to advance efficiently by investing in only one side forever.

The long-term direction is expansion beyond Earth and toward space exploration systems.

## Core Early-Game Resources

### 1. Research Points

Represents scientific output, study progress, theory development, and abstract knowledge accumulation.

Primary uses:

- Train higher academic roles
- Unlock scientific upgrades
- Support later advanced projects

### 2. Engineering Points

Represents practical implementation, applied construction, prototyping, and technical execution.

Primary uses:

- Convert students into labor and engineering roles
- Build infrastructure
- Support research throughput through tools and facilities

### 3. Space Capacity

This is the intended later-stage resource family placeholder. In the MVP UI it exists only as a visible future direction and partial lock target, not a fully developed system.

Possible later interpretations:

- Launch capacity
- Orbital materials
- Mission control influence
- Exploration data

## Population Ladder

Population is not generic villagers. The social base is academic and technical talent.

### Base Unit

- Undergraduate

This is the core recruitable population in the early game.

### Mid-Tier and Specialized Roles

- Worker
- Engineer
- Master's Student
- PhD Candidate

## Design Intent For Population

- Undergraduates are flexible but low-efficiency
- Workers lean engineering
- Engineers strongly amplify engineering systems
- Master's students improve research generation
- PhD candidates provide stronger late-early research scaling and unlock advanced systems

## Example Early Progression Loop

1. Manual study generates Research Points
2. Manual prototyping generates Engineering Points
3. Research and Engineering together recruit Undergraduates
4. Undergraduates can be assigned into academic or technical paths
5. Specialized roles improve point generation
6. Buildings amplify one side, but usually cost both sides
7. The player feels the tension between "understand it" and "build it"

## First MVP Content Set

### Resources

- `research`
- `engineering`
- `space`

### Population Roles

- `undergraduate`
- `worker`
- `engineer`
- `masters`
- `phd`

### Buildings

- `study_room`
- `prototype_lab`
- `machine_shop`
- `research_lab`

### Early Upgrades / Milestones

- Better Notes
- Shared Toolbench
- Structured Curriculum
- Experimental Fabrication

## Interaction Model For MVP

The MVP should support:

- Manual click actions for research and engineering
- A visible resource bar
- A visible role roster
- Buttons for recruiting and conversion
- A building list with costs
- Passive production per second
- A lightweight event log

## Balancing Direction

- The first 20 to 40 seconds should allow a first role unlock
- Research and Engineering should both be needed for recruitment
- Buildings should usually cost both resource types
- Role conversion should push the player into tradeoffs instead of obvious one-track optimization
- Space should remain mostly locked in the MVP but visible enough to create direction

## Architectural Direction

The frontend should be data-driven:

- Stable ids for all resources, roles, buildings, and technologies
- Separate config files for display names, descriptions, costs, and effects
- Game logic should operate on ids, not hard-coded display text

This keeps the project easy to rebalance and rewrite as the design matures.
