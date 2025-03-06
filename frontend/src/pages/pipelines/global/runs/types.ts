export enum PipelineRunType {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SCHEDULED = 'scheduled',
}

export enum PipelineRunTabTitle {
  ACTIVE = 'Runs',
  ARCHIVED = 'Archive',
  SCHEDULES = 'Schedules',
}

export type PipelineResourceRestoreResult = true | Error | undefined;

export type StatusEntry<T> = { item: T; status: PipelineResourceRestoreResult };
