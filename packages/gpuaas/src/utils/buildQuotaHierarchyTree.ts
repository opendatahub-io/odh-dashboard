import { ClusterQueueKind, CohortKind } from '@odh-dashboard/k8s-core';
import { filterAcceleratorCQs } from './clusterQueueUtils';
import { QUOTA_UNASSIGNED_LABEL, QUOTA_UNASSIGNED_NODE_ID } from '../const';
import { QuotaTreeNode } from '../types';

const cohortNodeId = (name: string): string => `cohort-${name}`;
const clusterQueueNodeId = (name: string): string => `cq-${name}`;

const sortChildren = (children: QuotaTreeNode[]): QuotaTreeNode[] =>
  [...children].toSorted((a, b) => {
    if (a.type !== b.type) {
      if (a.type === 'cohort') {
        return -1;
      }
      if (b.type === 'cohort') {
        return 1;
      }
    }
    return a.name.localeCompare(b.name);
  });

const createCohortNode = (name: string): QuotaTreeNode => ({
  id: cohortNodeId(name),
  name,
  type: 'cohort',
  cohortName: name,
  children: [],
  selectable: true,
});

const createClusterQueueNode = (cq: ClusterQueueKind): QuotaTreeNode => {
  const name = cq.metadata?.name ?? '';
  return {
    id: clusterQueueNodeId(name),
    name,
    type: 'clusterQueue',
    children: [],
    clusterQueue: cq,
    selectable: true,
  };
};

const createUnassignedNode = (clusterQueues: ClusterQueueKind[]): QuotaTreeNode => ({
  id: QUOTA_UNASSIGNED_NODE_ID,
  name: QUOTA_UNASSIGNED_LABEL,
  type: 'unassigned',
  children: sortChildren(clusterQueues.map(createClusterQueueNode)),
  selectable: true,
});

/**
 * Builds the Quota usage navigation tree from raw Kueue cohort and cluster queue resources.
 */
export const buildQuotaHierarchyTree = (
  cohorts: CohortKind[],
  clusterQueues: ClusterQueueKind[],
): QuotaTreeNode[] => {
  const acceleratorCQs = filterAcceleratorCQs(clusterQueues);
  if (acceleratorCQs.length === 0) {
    return [];
  }

  const cohortResourceByName = new Map(
    cohorts.flatMap((cohort) => {
      const name = cohort.metadata?.name;
      return name ? [[name, cohort] as const] : [];
    }),
  );

  const cqsByCohortName = new Map<string, ClusterQueueKind[]>();
  const unassignedCQs: ClusterQueueKind[] = [];

  for (const cq of acceleratorCQs) {
    const { cohortName } = cq.spec;
    if (!cohortName) {
      unassignedCQs.push(cq);
      continue;
    }
    const existing = cqsByCohortName.get(cohortName) ?? [];
    existing.push(cq);
    cqsByCohortName.set(cohortName, existing);
  }

  const cohortNames = new Set<string>([...cohortResourceByName.keys(), ...cqsByCohortName.keys()]);

  const cohortNodes = new Map<string, QuotaTreeNode>();
  for (const name of cohortNames) {
    cohortNodes.set(name, createCohortNode(name));
  }

  for (const [cohortName, cqs] of cqsByCohortName) {
    const node = cohortNodes.get(cohortName);
    if (!node) {
      continue;
    }
    node.children.push(...cqs.map(createClusterQueueNode));
    node.children = sortChildren(node.children);
  }

  const childCohortNames = new Set<string>();

  for (const [name, cohortResource] of cohortResourceByName) {
    const { parentName } = cohortResource.spec;
    if (!parentName || parentName === name) {
      continue;
    }

    const childNode = cohortNodes.get(name);
    const parentNode = cohortNodes.get(parentName);
    if (!childNode || !parentNode) {
      continue;
    }

    if (parentNode.children.some((child) => child.id === childNode.id)) {
      continue;
    }

    const firstClusterQueueIndex = parentNode.children.findIndex(
      (child) => child.type === 'clusterQueue',
    );
    if (firstClusterQueueIndex === -1) {
      parentNode.children.push(childNode);
    } else {
      parentNode.children.splice(firstClusterQueueIndex, 0, childNode);
    }
    childCohortNames.add(name);
  }

  const roots: QuotaTreeNode[] = [];

  for (const [name, node] of cohortNodes) {
    if (childCohortNames.has(name)) {
      continue;
    }
    roots.push(node);
  }

  if (unassignedCQs.length > 0) {
    roots.unshift(createUnassignedNode(unassignedCQs));
  }

  const unassignedRoot = roots.find((node) => node.type === 'unassigned');
  const cohortRoots = sortChildren(roots.filter((node) => node.type !== 'unassigned'));

  return unassignedRoot ? [unassignedRoot, ...cohortRoots] : cohortRoots;
};
