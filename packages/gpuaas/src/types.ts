import { ClusterQueueKind, CohortKind } from '@odh-dashboard/internal/k8sTypes';
import { ContainerResourceAttributes } from '@odh-dashboard/k8s-core';

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
