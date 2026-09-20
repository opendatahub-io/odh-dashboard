import { buildTreeEdgePath } from '~/app/topology/tree-view/treeEdgePath';

describe('buildTreeEdgePath', () => {
  it('draws a horizontal line between side-centers of aligned nodes', () => {
    const path = buildTreeEdgePath(
      { x: 0, y: 0, width: 48, height: 48 },
      { x: 120, y: 0, width: 48, height: 48 },
    );
    expect(path).toBe('M 48 24 L 120 24');
  });

  it('uses vertical side-centers so distant branches do not drift with angle anchors', () => {
    const path = buildTreeEdgePath(
      { x: 0, y: 176, width: 48, height: 48 },
      { x: 144, y: 286, width: 28, height: 28 },
    );
    expect(path).toBe('M 48 200 C 96 200, 96 300, 144 300');
  });

  it('returns an empty path when nodes occupy the same point', () => {
    const path = buildTreeEdgePath(
      { x: 10, y: 10, width: 0, height: 0 },
      { x: 10, y: 10, width: 0, height: 0 },
    );
    expect(path).toBe('');
  });
});
