import {
  buildingDefinitions,
  type BuildingDefinition,
  type BuildingId,
} from "./game-config";

export type { BuildingDefinition, BuildingId };

export const buildingIds = buildingDefinitions.map((building) => building.id) as BuildingId[];

export const buildingDefinitionsById: Record<BuildingId, BuildingDefinition> = Object.fromEntries(
  buildingDefinitions.map((building) => [building.id, building]),
) as Record<BuildingId, BuildingDefinition>;

export { buildingDefinitions };
