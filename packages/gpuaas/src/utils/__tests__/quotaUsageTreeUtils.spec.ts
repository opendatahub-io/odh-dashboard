import {
  buildCohortOnlyQuotaTree,
  buildDuplicateSiblingNameQuotaTree,
  buildQuotaUtilsTestTree,
  makeCQ,
  makeCohort,
} from './quotaHierarchyFixtures';
import { buildQuotaHierarchyTree } from '../buildQuotaHierarchyTree';
import { QUOTA_NODE_TYPE } from '../../types';
import {
  collectAllExpandableNodeIds,
  collectExpandedNodeIds,
  findQuotaTreeNode,
  getAncestorNodeIds,
  getDefaultQuotaSelection,
  getExpandedIdsForSelection,
  getQuotaNodePath,
  filterQuotaTreeByName,
  nodeIdFromSelection,
  selectionFromPath,
  syncQuotaSelectionWithTree,
} from '../quotaUsageTreeUtils';

describe('quotaUsageTreeUtils', () => {
  const tree = buildQuotaUtilsTestTree();
  const cohortOnlyTree = buildCohortOnlyQuotaTree();

  it.each([
    ['quota-unassigned', ['Unassigned']],
    ['cq-legacy-batch', ['Unassigned', 'legacy-batch']],
    ['cohort-production', ['production']],
    ['cohort-inference-edge', ['production', 'inference-edge']],
    ['cq-prod-serving', ['production', 'inference-edge', 'prod-serving']],
  ] as const)('round-trips path and selection for %s', (nodeId, expectedPath) => {
    expect(getQuotaNodePath(tree, nodeId)).toEqual(expectedPath);
    const selection = selectionFromPath(tree, [...expectedPath]);
    if (!selection) {
      expect(selection).toBeDefined();
      return;
    }
    expect(nodeIdFromSelection(selection)).toBe(nodeId);
  });

  it.each([
    ['known node', 'cq-prod-serving', 'prod-serving'],
    ['missing node', 'cq-missing', undefined],
  ] as const)('findQuotaTreeNode returns %s', (_label, nodeId, expectedName) => {
    const node = findQuotaTreeNode(tree, nodeId);
    if (expectedName === undefined) {
      expect(node).toBeUndefined();
      return;
    }
    expect(node?.name).toBe(expectedName);
  });

  it('collects ancestor and expanded ids for nested selections', () => {
    const selection = selectionFromPath(tree, ['production', 'inference-edge', 'prod-serving']);
    expect(getAncestorNodeIds(tree, 'cq-prod-serving')).toEqual([
      'cohort-production',
      'cohort-inference-edge',
    ]);
    expect(getExpandedIdsForSelection(tree, selection)).toEqual(
      new Set(['cohort-production', 'cohort-inference-edge']),
    );
  });

  it.each([
    [
      'when unassigned bucket exists',
      tree,
      { type: QUOTA_NODE_TYPE.unassigned, path: ['Unassigned'] },
    ],
    [
      'when no unassigned cluster queues exist',
      cohortOnlyTree,
      { type: QUOTA_NODE_TYPE.cohort, cohortName: 'production', path: ['production'] },
    ],
  ] as const)('defaults selection %s', (_label, testTree, expected) => {
    expect(getDefaultQuotaSelection(testTree)).toEqual(expected);
  });

  it('filters tree nodes by search query and leaves tree unchanged for empty search', () => {
    expect(filterQuotaTreeByName(tree, '')).toBe(tree);
    const filtered = filterQuotaTreeByName(tree, 'prod-serving');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('production');
    expect(filtered[0].children[0].children[0].name).toBe('prod-serving');
  });

  it('keeps full subtree when a parent cohort name matches the search query', () => {
    const filtered = filterQuotaTreeByName(tree, 'production');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('production');
    expect(filtered[0].children[0].name).toBe('inference-edge');
    expect(filtered[0].children[0].children[0].name).toBe('prod-serving');
  });

  it('keeps unassigned cluster queues when the unassigned bucket name matches', () => {
    const filtered = filterQuotaTreeByName(tree, 'unassigned');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Unassigned');
    expect(filtered[0].children[0].name).toBe('legacy-batch');
  });

  it('backtracks to the next same-named sibling when the first path match is a dead end', () => {
    const duplicateNameTree = buildDuplicateSiblingNameQuotaTree();
    const clusterQueueSelection = selectionFromPath(duplicateNameTree, [
      'production',
      'inference-edge',
      'prod-serving',
    ]);

    expect(clusterQueueSelection?.type).toBe(QUOTA_NODE_TYPE.clusterQueue);
    if (clusterQueueSelection?.type !== QUOTA_NODE_TYPE.clusterQueue) {
      return;
    }
    expect(nodeIdFromSelection(clusterQueueSelection)).toBe('cq-prod-serving');
    expect(clusterQueueSelection.clusterQueueName).toBe('prod-serving');
  });

  it('re-derives cluster queue selection from refreshed tree data', () => {
    const staleSelection = selectionFromPath(tree, [
      'production',
      'inference-edge',
      'prod-serving',
    ]);
    if (!staleSelection || staleSelection.type !== QUOTA_NODE_TYPE.clusterQueue) {
      expect(staleSelection?.type).toBe(QUOTA_NODE_TYPE.clusterQueue);
      return;
    }

    const refreshedTree = buildQuotaHierarchyTree(
      [makeCohort('production'), makeCohort('inference-edge', 'production')],
      [makeCQ('prod-serving', 'inference-edge', '8'), makeCQ('legacy-batch')],
    );

    const syncedSelection = syncQuotaSelectionWithTree(refreshedTree, staleSelection);
    if (!syncedSelection || syncedSelection.type !== QUOTA_NODE_TYPE.clusterQueue) {
      expect(syncedSelection?.type).toBe(QUOTA_NODE_TYPE.clusterQueue);
      return;
    }

    expect(syncedSelection.clusterQueue).not.toBe(staleSelection.clusterQueue);
    expect(
      syncedSelection.clusterQueue.spec.resourceGroups?.[0]?.flavors?.[0]?.resources?.[0]
        ?.nominalQuota,
    ).toBe('8');
  });

  it('collects expandable and search-expanded node ids', () => {
    const expandable = collectAllExpandableNodeIds(tree);
    expect(expandable.has('quota-unassigned')).toBe(true);
    expect(expandable.has('cohort-production')).toBe(true);
    expect(expandable.has('cq-prod-serving')).toBe(false);

    const searchExpanded = collectExpandedNodeIds(tree, 'prod-serving');
    expect(searchExpanded.has('cohort-production')).toBe(true);
    expect(searchExpanded.has('cohort-inference-edge')).toBe(true);
  });
});
