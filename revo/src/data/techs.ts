import { techDefinitions, type TechDefinition, type TechId } from "./game-config";

export type { TechDefinition, TechId };

export const techIds = techDefinitions.map((tech) => tech.id) as TechId[];

export const techDefinitionsById: Record<TechId, TechDefinition> = Object.fromEntries(
  techDefinitions.map((tech) => [tech.id, tech]),
) as Record<TechId, TechDefinition>;

export { techDefinitions };
