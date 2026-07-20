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
    vector_store: { datasource_type: 'milvus', collection_name: 'collection0' },
    chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
    embedding: {
      model_id: 'mock-embed',
      distance_metric: 'cosine',
      embedding_params: {
        embedding_dimension: 768,
        context_length: 512,
        timeout: null,
        model_type: null,
        provider_id: null,
        provider_resource_id: null,
      },
    },
    retrieval: { method: 'window', number_of_chunks: 5 },
    generation: {
      model_id: 'mock-gen',
      context_template_text: '{document}',
      user_message_text: '',
      system_message_text: '',
    },
  },
  scores: {},
  final_score: 0,
});

describe('useTreeViewData', () => {
  it('should select the best pattern key when patterns are available', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], 'pattern_b'));

    expect(result.current.selectedPattern).toBe('pattern_b');
    expect(result.current.stageMapNodes).toEqual([]);
  });

  it('should leave selectedPattern undefined when best-pattern metadata is unavailable', () => {
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

  it('should prefer stage map best pattern over the first loaded pattern while resolving keys', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], undefined, 'pattern_b'));

    expect(result.current.selectedPattern).toBe('pattern_b');
  });

  it('should not select an invalid stage map best pattern when it is not a patterns key', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() =>
      useTreeViewData(patterns, [], undefined, 'missing_best_pattern'),
    );

    expect(result.current.selectedPattern).toBeUndefined();
  });

  it('should ignore a stale bestPatternKey and fall back to a valid stage map best pattern', () => {
    const patterns = {
      pattern_a: createPattern('Pattern A'),
      pattern_b: createPattern('Pattern B'),
    };

    const { result } = renderHook(() =>
      useTreeViewData(patterns, [], 'stale_best_pattern', 'pattern_b'),
    );

    expect(result.current.selectedPattern).toBe('pattern_b');
  });

  it('should preserve the patterns-record key when display names collide', () => {
    const patterns = {
      pattern_a: createPattern('Shared Name'),
      pattern_b: createPattern('Shared Name'),
    };

    const { result } = renderHook(() => useTreeViewData(patterns, [], 'pattern_b'));

    expect(result.current.selectedPattern).toBe('pattern_b');
  });
});
