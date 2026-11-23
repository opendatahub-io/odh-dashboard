/* eslint-disable camelcase -- test data matches AutoragPattern API field names */
import { renderHook } from '@testing-library/react';
import { useTreeViewData } from '~/app/topology/tree-view/useTreeViewData';
import type { AutoragPattern } from '~/app/types/autoragPattern';

const createPattern = (name: string): AutoragPattern => ({
  name,
  iteration: 0,
  max_combinations: 1,
  duration_seconds: 0,
  settings: {
    chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
    embedding: {
      model_id: 'mock-embed',
      embedding_params: {
        embedding_dimension: 768,
      },
    },
    retrieval: { method: 'window', number_of_chunks: 5 },
    generation: {
      model_id: 'mock-gen',
    },
  },
  evaluation: { metrics: [] },
});

describe('useTreeViewData', () => {
  it('should select the rank-one pattern key when provided', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], 'pattern_b'));

    expect(result.current.selectedPattern).toBe('pattern_b');
    expect(result.current.winnerPatternLabel).toBe('Pattern B');
    expect(result.current.stageMapNodes).toEqual([]);
  });

  it('should leave selectedPattern undefined when rank-one metadata is unavailable', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, undefined, undefined));

    expect(result.current.selectedPattern).toBeUndefined();
  });

  it('should handle unavailable patterns without throwing', () => {
    const { result } = renderHook(() => useTreeViewData(undefined));

    expect(result.current.selectedPattern).toBeUndefined();
    expect(result.current.stageMapNodes).toBeUndefined();
  });

  it('should leave selectedPattern undefined when patterns are unavailable', () => {
    const { result } = renderHook(() => useTreeViewData(undefined, [], 'fallback-pattern'));

    expect(result.current.selectedPattern).toBeUndefined();
  });

  it('should not use stage-map best pattern metadata to resolve the topology winner', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], undefined));

    expect(result.current.selectedPattern).toBeUndefined();
  });

  it('should ignore normalized stage-map winner identifiers', () => {
    const patterns = {
      pattern_one: createPattern('Pattern One'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], undefined));

    expect(result.current.selectedPattern).toBeUndefined();
    expect(result.current.winnerPatternLabel).toBeUndefined();
  });

  it('should not select an invalid stage map best pattern when it is not a patterns key', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], undefined));

    expect(result.current.selectedPattern).toBeUndefined();
  });

  it('should not fall back to stage-map metadata when rank-one metadata is stale', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], 'stale_best_pattern'));

    expect(result.current.selectedPattern).toBeUndefined();
  });

  it('should preserve the patterns-record key when display names collide', () => {
    const patterns = {
      pattern_a: createPattern('Shared Name'),
      pattern_b: createPattern('Shared Name'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], 'pattern_b'));

    expect(result.current.selectedPattern).toBe('pattern_b');
  });

  it('should not select an invalid pattern record', () => {
    const patterns = {
      pattern_b: null as unknown as AutoragPattern,
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], 'pattern_b'));

    expect(result.current.selectedPattern).toBeUndefined();
    expect(result.current.winnerPatternLabel).toBeUndefined();
  });

  it('should leave winnerPatternLabel undefined when the selected pattern name is not a string', () => {
    const patterns = {
      pattern_b: {
        ...createPattern('Pattern B'),
        name: 42 as unknown as string,
      },
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], 'pattern_b'));

    expect(result.current.selectedPattern).toBe('pattern_b');
    expect(result.current.winnerPatternLabel).toBeUndefined();
  });
});
