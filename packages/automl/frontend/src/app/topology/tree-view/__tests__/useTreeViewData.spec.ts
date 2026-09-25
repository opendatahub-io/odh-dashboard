/* eslint-disable camelcase -- test data matches AutomlModel API field names */
import { renderHook } from '@testing-library/react';
import { useTreeViewData } from '~/app/topology/tree-view/useTreeViewData';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';

const createModel = (name: string): AutomlModel => ({
  name,
  location: {
    model_directory: '/models',
    predictor: 'predictor.pkl',
    notebook: 'notebook.ipynb',
  },
  metrics: { test_data: {} },
});

describe('useTreeViewData', () => {
  it('should select the best model key when models are available', () => {
    const models = {
      model_a: createModel('Model A'),
      model_b: createModel('Model B'),
    };

    const { result } = renderHook(() => useTreeViewData(models, [], 'model_b'));

    expect(result.current.selectedModel).toBe('model_b');
    expect(result.current.winnerModelLabel).toBe('Model B');
    expect(result.current.stageMapNodes).toEqual([]);
  });

  it('should leave selectedModel undefined when best-model metadata is unavailable', () => {
    const models = {
      model_a: createModel('Model A'),
      model_b: createModel('Model B'),
    };

    const { result } = renderHook(() => useTreeViewData(models, undefined, undefined));

    expect(result.current.selectedModel).toBeUndefined();
  });

  it('should handle unavailable models without throwing', () => {
    const { result } = renderHook(() => useTreeViewData(undefined));

    expect(result.current.selectedModel).toBeUndefined();
    expect(result.current.stageMapNodes).toBeUndefined();
  });

  it('should leave selectedModel undefined when models are unavailable', () => {
    const { result } = renderHook(() => useTreeViewData(undefined, [], 'fallback-model'));

    expect(result.current.selectedModel).toBeUndefined();
  });

  it('should prefer stage map best model over the first loaded model while resolving keys', () => {
    const models = {
      model_a: createModel('Model A'),
      model_b: createModel('Model B'),
    };

    const { result } = renderHook(() => useTreeViewData(models, [], undefined, 'model_b'));

    expect(result.current.selectedModel).toBe('model_b');
  });

  it('should not select an invalid stage map best model when it is not a models key', () => {
    const models = {
      model_a: createModel('Model A'),
      model_b: createModel('Model B'),
    };

    const { result } = renderHook(() =>
      useTreeViewData(models, [], undefined, 'missing_best_model'),
    );

    expect(result.current.selectedModel).toBeUndefined();
  });

  it('should ignore a stale bestModelKey and fall back to a valid stage map best model', () => {
    const models = {
      model_a: createModel('Model A'),
      model_b: createModel('Model B'),
    };

    const { result } = renderHook(() => useTreeViewData(models, [], 'stale_best_model', 'model_b'));

    expect(result.current.selectedModel).toBe('model_b');
  });

  it('should preserve the models-record key when display names collide', () => {
    const models = {
      model_a: createModel('Shared Name'),
      model_b: createModel('Shared Name'),
    };

    const { result } = renderHook(() => useTreeViewData(models, [], 'model_b'));

    expect(result.current.selectedModel).toBe('model_b');
  });

  it('should alias ranks by display name without replacing existing model-key ranks', () => {
    const models = {
      model_a: createModel('model_b'),
      model_b: createModel('Display Name B'),
      model_c: createModel('   '),
    };

    const { result } = renderHook(() => useTreeViewData(models));

    expect(result.current.modelRanks).toEqual({
      model_a: 1,
      model_b: 2,
      model_c: 3,
      'Display Name B': 2,
    });
  });

  it('should preserve model-key ranks when display names are missing or non-string', () => {
    const models = {
      model_a: { ...createModel('Model A'), name: 42 },
      model_b: { ...createModel('Model B'), name: undefined },
    } as unknown as Record<string, AutomlModel>;

    const { result } = renderHook(() => useTreeViewData(models));

    expect(result.current.modelRanks).toEqual({ model_a: 1, model_b: 2 });
  });

  it('should skip null models when adding name aliases and preserve their key ranks', () => {
    const models = {
      model_a: null,
      model_b: createModel('Model B'),
    } as unknown as Record<string, AutomlModel>;

    const { result } = renderHook(() => useTreeViewData(models));

    expect(result.current.modelRanks).toEqual({ model_a: 1, model_b: 2, 'Model B': 2 });
  });
});
