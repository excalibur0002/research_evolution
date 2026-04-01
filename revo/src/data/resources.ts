import {
  resourceDefinitions,
  type ResourceDefinition,
  type ResourceId,
} from "./game-config";

export type { ResourceDefinition, ResourceId };

export const resourceIds = resourceDefinitions.map((resource) => resource.id) as ResourceId[];

export const resourceNameById: Record<ResourceId, string> = Object.fromEntries(
  resourceDefinitions.map((resource) => [resource.id, resource.name]),
) as Record<ResourceId, string>;

export const resourceDefinitionsById: Record<ResourceId, ResourceDefinition> = Object.fromEntries(
  resourceDefinitions.map((resource) => [resource.id, resource]),
) as Record<ResourceId, ResourceDefinition>;

export { resourceDefinitions };
