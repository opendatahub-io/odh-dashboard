import { makeCohort, makeCQ } from './quotaHierarchyFixtures';
import { QUOTA_UNASSIGNED_NODE_ID } from '../../const';
import { QUOTA_NODE_TYPE } from '../../types';
import { buildQuotaHierarchyTree } from '../buildQuotaHierarchyTree';

describe('buildQuotaHierarchyTree', () => {
  it('returns empty tree when no accelerator cluster queues exist', () => {
    expect(buildQuotaHierarchyTree([], [])).toEqual([]);
    expect(
      buildQuotaHierarchyTree([makeCohort('cohort-1')], [makeCQ('cpu-only', 'cohort-1', '0')]),
    ).toEqual([]);
  });

  it('places standalone cluster queues under Unassigned', () => {
    const tree = buildQuotaHierarchyTree([], [makeCQ('legacy-batch'), makeCQ('shared-inference')]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(QUOTA_UNASSIGNED_NODE_ID);
    expect(tree[0].children.map((child) => child.name)).toEqual([
      'legacy-batch',
      'shared-inference',
    ]);
  });

  it('places Unassigned before cohort roots', () => {
    const tree = buildQuotaHierarchyTree(
      [makeCohort('production')],
      [makeCQ('legacy-batch'), makeCQ('prod-serving', 'production')],
    );

    expect(tree).toHaveLength(2);
    expect(tree[0].type).toBe(QUOTA_NODE_TYPE.unassigned);
    expect(tree[0].children.map((child) => child.name)).toEqual(['legacy-batch']);
    expect(tree[1].name).toBe('production');
  });

  it('nests cohorts via parentName and attaches cluster queue leaves', () => {
    const tree = buildQuotaHierarchyTree(
      [makeCohort('production'), makeCohort('inference-edge', 'production')],
      [makeCQ('prod-serving', 'inference-edge'), makeCQ('staging-serving', 'inference-edge')],
    );

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('production');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('inference-edge');
    expect(tree[0].children[0].children.map((child) => child.name)).toEqual([
      'prod-serving',
      'staging-serving',
    ]);
  });

  it('supports flat cohorts with direct cluster queue children', () => {
    const tree = buildQuotaHierarchyTree([makeCohort('cohort-1')], [makeCQ('cq-a', 'cohort-1')]);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('cohort-1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('cq-a');
  });

  it('includes implicit cohorts referenced only by cluster queues', () => {
    const tree = buildQuotaHierarchyTree([], [makeCQ('cq-a', 'implicit-cohort')]);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('implicit-cohort');
    expect(tree[0].children[0].name).toBe('cq-a');
  });

  it('includes cohort resources without cluster queues', () => {
    const tree = buildQuotaHierarchyTree([makeCohort('empty-cohort')], []);

    expect(tree).toHaveLength(0);
  });

  it('treats cohorts with missing parent as roots', () => {
    const tree = buildQuotaHierarchyTree(
      [makeCohort('child', 'missing-parent')],
      [makeCQ('cq-a', 'child')],
    );

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('child');
  });
});
