import { TopologyEdgeModel } from '#~/components/lineage/types';
import { findConnectedElements } from '#~/components/lineage/graphUtils';

const edge = (
  id: string,
  source: string,
  target: string,
  isPositioningEdge = false,
): TopologyEdgeModel => ({
  id,
  type: 'curved-edge',
  source,
  target,
  data: isPositioningEdge ? { isPositioningEdge } : undefined,
});

describe('findConnectedElements', () => {
  it('returns an empty array when no node id is given', () => {
    expect(findConnectedElements('', [edge('e1', 'a', 'b')])).toEqual([]);
  });

  it('returns only the node itself when the graph is empty', () => {
    expect(findConnectedElements('a', [])).toEqual(['a']);
  });

  it('returns only the node itself when it is isolated', () => {
    expect(findConnectedElements('b', [edge('e1', 'a', 'c')])).toEqual(['b']);
  });

  it('returns the node when it is not part of the graph', () => {
    expect(findConnectedElements('unknown', [edge('e1', 'a', 'b')])).toEqual(['unknown']);
  });

  it('walks one hop downstream including the traversed edge', () => {
    expect(findConnectedElements('a', [edge('e1', 'a', 'b')])).toEqual(['a', 'e1', 'b']);
  });

  it('walks one hop upstream including the traversed edge', () => {
    expect(findConnectedElements('b', [edge('e1', 'a', 'b')])).toEqual(['b', 'e1', 'a']);
  });

  it('follows a chain of edges in both directions', () => {
    const result = findConnectedElements('b', [
      edge('e1', 'a', 'b'),
      edge('e2', 'b', 'c'),
      edge('e3', 'd', 'e'),
    ]);

    expect(result).toEqual(['b', 'e1', 'a', 'e2', 'c']);
  });

  it('does not walk from a target to the other sources of that target', () => {
    const result = findConnectedElements('a', [edge('e1', 'a', 'b'), edge('e2', 'c', 'b')]);

    expect(result).toEqual(['a', 'e1', 'b']);
    expect(result).not.toContain('c');
  });

  it('ignores edges flagged as positioning edges', () => {
    const result = findConnectedElements('a', [
      edge('e1', 'a', 'b'),
      edge('pos-1', 'a', 'c', true),
    ]);

    expect(result).toEqual(['a', 'e1', 'b']);
    expect(result).not.toContain('pos-1');
  });

  it('terminates on cycles and lists every element once', () => {
    const result = findConnectedElements('a', [
      edge('e1', 'a', 'b'),
      edge('e2', 'b', 'c'),
      edge('e3', 'c', 'a'),
    ]);

    expect(result.toSorted()).toEqual(['a', 'b', 'c', 'e1', 'e2', 'e3']);
    expect(new Set(result).size).toBe(result.length);
  });

  it('reaches downstream branches through cycle-shared nodes', () => {
    const result = findConnectedElements('a', [
      edge('e1', 'a', 'b'),
      edge('e2', 'b', 'c'),
      edge('e3', 'c', 'a'),
      edge('e4', 'b', 'd'),
    ]);

    expect(result.toSorted()).toEqual(['a', 'b', 'c', 'd', 'e1', 'e2', 'e3', 'e4']);
    expect(new Set(result).size).toBe(result.length);
  });
});
