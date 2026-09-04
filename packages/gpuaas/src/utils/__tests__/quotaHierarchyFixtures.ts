import { ClusterQueueKind, CohortKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';
import { buildQuotaHierarchyTree } from '../buildQuotaHierarchyTree';
import { QuotaTreeNode } from '../../types';

export const makeCohort = (name: string, parentName?: string): CohortKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'Cohort',
  metadata: { name },
  spec: {
    ...(parentName ? { parentName } : {}),
    resourceGroups: [],
  },
});

const GPU_RESOURCE = 'nvidia.com/gpu' as ContainerResourceAttributes;

export const makeCQ = (name: string, cohortName?: string, gpuQuota = '4'): ClusterQueueKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'ClusterQueue',
  metadata: { name },
  spec: {
    ...(cohortName ? { cohortName } : {}),
    resourceGroups: [
      {
        coveredResources: [GPU_RESOURCE],
        flavors: [
          {
            name: 'gpu-flavor',
            resources: [{ name: GPU_RESOURCE, nominalQuota: gpuQuota }],
          },
        ],
      },
    ],
  },
  status: {
    admittedWorkloads: 0,
    pendingWorkloads: 0,
    flavorsUsage: [],
  },
});

/** Unassigned CQ + nested production/inference-edge cohorts — shared utils test tree. */
export const buildQuotaUtilsTestTree = (): QuotaTreeNode[] =>
  buildQuotaHierarchyTree(
    [makeCohort('production'), makeCohort('inference-edge', 'production')],
    [makeCQ('prod-serving', 'inference-edge'), makeCQ('legacy-batch')],
  );

/** Cohort-only tree with no unassigned bucket. */
export const buildCohortOnlyQuotaTree = (): QuotaTreeNode[] =>
  buildQuotaHierarchyTree([makeCohort('production')], [makeCQ('prod-serving', 'production')]);

/** Same-named CQ/cohort siblings under production — tests selectionFromPath backtracking. */
export const buildDuplicateSiblingNameQuotaTree = (): QuotaTreeNode[] => [
  {
    id: 'cohort-production',
    name: 'production',
    type: 'cohort',
    cohortName: 'production',
    selectable: true,
    children: [
      {
        id: 'cq-inference-edge',
        name: 'inference-edge',
        type: 'clusterQueue',
        selectable: true,
        children: [],
        clusterQueue: makeCQ('inference-edge', 'production'),
      },
      {
        id: 'cohort-inference-edge',
        name: 'inference-edge',
        type: 'cohort',
        cohortName: 'inference-edge',
        selectable: true,
        children: [
          {
            id: 'cq-prod-serving',
            name: 'prod-serving',
            type: 'clusterQueue',
            selectable: true,
            children: [],
            clusterQueue: makeCQ('prod-serving', 'inference-edge'),
          },
        ],
      },
    ],
  },
];
