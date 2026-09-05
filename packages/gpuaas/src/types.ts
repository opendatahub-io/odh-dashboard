import { ClusterQueueKind, CohortKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';

export const QUOTA_NODE_TYPE = {
  unassigned: 'unassigned',
  cohort: 'cohort',
  clusterQueue: 'clusterQueue',
} as const;

export type QuotaNodeType = (typeof QUOTA_NODE_TYPE)[keyof typeof QUOTA_NODE_TYPE];

export type QuotaTreeNode = {
  id: string;
  name: string;
  type: QuotaNodeType;
  children: QuotaTreeNode[];
  clusterQueue?: ClusterQueueKind;
  cohortName?: string;
  selectable: boolean;
};

export type QuotaSelection =
  | { type: 'unassigned'; path: string[] }
  | { type: 'cohort'; cohortName: string; path: string[] }
  | {
      type: 'clusterQueue';
      clusterQueueName: string;
      path: string[];
      clusterQueue: ClusterQueueKind;
    };

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

export type KueueProject = {
  name: string;
};
