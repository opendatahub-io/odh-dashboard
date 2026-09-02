import { buildCohortOnlyQuotaTree, buildQuotaUtilsTestTree } from './quotaHierarchyFixtures';
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
