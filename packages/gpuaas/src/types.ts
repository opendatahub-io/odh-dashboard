import { ClusterQueueKind, CohortKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';

export type CohortState = 'explicit' | 'implicit' | 'standalone';

export type ResourceQuota = {
  name: ContainerResourceAttributes;
  nominalQuota: number;
};

export type FlavorQuota = {
  name: string;
  resources: ResourceQuota[];
};

export type UnifiedCohort = {
  name: string;
  state: CohortState;
  cohortResource?: CohortKind;
  memberClusterQueues: ClusterQueueKind[];
  effectivePool: FlavorQuota[];
};

/** null = still loading; undefined = loaded but no telemetry data for this model */
export type CQDcgmResult = {
  computePercentage: number | null | undefined;
  memoryPercentage: number | null | undefined;
};
