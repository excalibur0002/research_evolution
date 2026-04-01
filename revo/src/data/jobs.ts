import { jobDefinitions, type JobDefinition, type JobId } from "./game-config";

export type { JobDefinition, JobId };

export const jobIds = jobDefinitions.map((job) => job.id) as JobId[];

export const jobDefinitionsById: Record<JobId, JobDefinition> = Object.fromEntries(
  jobDefinitions.map((job) => [job.id, job]),
) as Record<JobId, JobDefinition>;

export const jobNameById: Record<JobId, string> = Object.fromEntries(
  jobDefinitions.map((job) => [job.id, job.name]),
) as Record<JobId, string>;

export { jobDefinitions };
