import { buildTreeEdgePath, fanOutLabelClearX } from '~/app/topology/tree-view/treeEdgePath';

describe('buildTreeEdgePath', () => {
  it('draws a horizontal line between side-centers of aligned nodes', () => {
    const path = buildTreeEdgePath(
      { x: 0, y: 0, width: 48, height: 48 },
      { x: 120, y: 0, width: 48, height: 48 },
    );
    expect(path).toBe('M 48 24 L 120 24');
  });

  it('flattens a fan into a horizontal run before the target', () => {
    const path = buildTreeEdgePath(
      { x: 0, y: 176, width: 48, height: 48 },
      { x: 144, y: 286, width: 28, height: 28 },
    );
    expect(path).toBe('M 48 200 C 72 200, 72 300, 96 300 L 144 300');
  });

  it('skips the row-label column on fan-out into the pattern table', () => {
    const target = { x: 300, y: 286, width: 28, height: 28 };
    const path = buildTreeEdgePath({ x: 0, y: 176, width: 48, height: 48 }, target, {
      clearX: fanOutLabelClearX(target.x),
    });
    expect(path).toBe('M 48 200 C 128 200, 128 300, 208 300 M 276 300 L 300 300');
  });

  it('returns an empty path when nodes occupy the same point', () => {
    const path = buildTreeEdgePath(
      { x: 10, y: 10, width: 0, height: 0 },
      { x: 10, y: 10, width: 0, height: 0 },
    );
    expect(path).toBe('');
  });
});
