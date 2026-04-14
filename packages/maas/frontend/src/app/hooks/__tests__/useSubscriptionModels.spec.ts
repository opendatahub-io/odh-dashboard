import { act } from '@testing-library/react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useSubscriptionModels } from '~/app/hooks/useSubscriptionModels';
import { MaaSModelRefSummary, SubscriptionModelEntry } from '~/app/types/subscriptions';

const makeModelRef = (name: string, namespace = 'maas-models'): MaaSModelRefSummary => ({
  name,
  namespace,
  modelRef: { kind: 'LLMInferenceService', name },
});

const makeEntry = (
  name: string,
  namespace = 'maas-models',
  tokenRateLimits = [{ limit: 100000, window: '24h' }],
): SubscriptionModelEntry => ({
  modelRefSummary: makeModelRef(name, namespace),
  tokenRateLimits,
});

describe('useSubscriptionModels', () => {
  it('should initialize with empty models by default', () => {
    const renderResult = testHook(useSubscriptionModels)();
    const { models, allModelsHaveRateLimits } = renderResult.result.current;

    expect(models).toHaveLength(0);
    expect(allModelsHaveRateLimits).toBe(true);
  });

  it('should initialize with provided models', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b')];
    const renderResult = testHook(useSubscriptionModels)(initial);

    expect(renderResult.result.current.models).toHaveLength(2);
    expect(renderResult.result.current.models[0].modelRefSummary.name).toBe('model-a');
    expect(renderResult.result.current.allModelsHaveRateLimits).toBe(true);
  });

  it('should add models via handleAddModels', () => {
    const renderResult = testHook(useSubscriptionModels)();

    act(() => {
      renderResult.result.current.handleAddModels([makeModelRef('model-a')]);
    });

    expect(renderResult.result.current.models).toHaveLength(1);
    expect(renderResult.result.current.models[0].modelRefSummary.name).toBe('model-a');
    expect(renderResult.result.current.models[0].tokenRateLimits).toEqual([]);
  });

  it('should not add duplicate models', () => {
    const initial = [makeEntry('model-a')];
    const renderResult = testHook(useSubscriptionModels)(initial);

    act(() => {
      renderResult.result.current.handleAddModels([
        makeModelRef('model-a'),
        makeModelRef('model-b'),
      ]);
    });

    expect(renderResult.result.current.models).toHaveLength(2);
    expect(renderResult.result.current.models[1].modelRefSummary.name).toBe('model-b');
  });

  it('should remove a model by index', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b'), makeEntry('model-c')];
    const renderResult = testHook(useSubscriptionModels)(initial);

    act(() => {
      renderResult.result.current.handleRemoveModel(1);
    });

    expect(renderResult.result.current.models).toHaveLength(2);
    expect(renderResult.result.current.models[0].modelRefSummary.name).toBe('model-a');
    expect(renderResult.result.current.models[1].modelRefSummary.name).toBe('model-c');
  });

  it('should remove models by ref', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b'), makeEntry('model-c')];
    const renderResult = testHook(useSubscriptionModels)(initial);

    act(() => {
      renderResult.result.current.handleRemoveModelsByRef([
        makeModelRef('model-a'),
        makeModelRef('model-c'),
      ]);
    });

    expect(renderResult.result.current.models).toHaveLength(1);
    expect(renderResult.result.current.models[0].modelRefSummary.name).toBe('model-b');
  });

  it('should save rate limits for the target model', () => {
    const initial = [makeEntry('model-a', 'ns', []), makeEntry('model-b', 'ns', [])];
    const renderResult = testHook(useSubscriptionModels)(initial);

    act(() => {
      renderResult.result.current.setEditLimitsTarget(0);
    });

    const newLimits = [{ limit: 50000, window: '1h' }];
    act(() => {
      renderResult.result.current.handleSaveRateLimits(newLimits);
    });

    expect(renderResult.result.current.models[0].tokenRateLimits).toEqual(newLimits);
    expect(renderResult.result.current.models[1].tokenRateLimits).toEqual([]);
  });

  it('should report allModelsHaveRateLimits correctly', () => {
    const initial = [makeEntry('model-a', 'ns', [{ limit: 1000, window: '1h' }])];
    const renderResult = testHook(useSubscriptionModels)(initial);

    expect(renderResult.result.current.allModelsHaveRateLimits).toBe(true);

    act(() => {
      renderResult.result.current.handleAddModels([makeModelRef('model-b')]);
    });

    expect(renderResult.result.current.allModelsHaveRateLimits).toBe(false);
  });

  it('should track rateLimitErrorIndices after closing the modal', () => {
    const initial = [makeEntry('model-a', 'ns', [])];
    const renderResult = testHook(useSubscriptionModels)(initial);

    expect(renderResult.result.current.rateLimitErrorIndices.size).toBe(0);

    act(() => {
      renderResult.result.current.setEditLimitsTarget(0);
    });
    act(() => {
      renderResult.result.current.handleCloseRateLimitsModal();
    });

    expect(renderResult.result.current.rateLimitErrorIndices.has(0)).toBe(true);
    expect(renderResult.result.current.editLimitsTarget).toBeNull();
  });

  it('should return the editingModel when editLimitsTarget is set', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b')];
    const renderResult = testHook(useSubscriptionModels)(initial);

    expect(renderResult.result.current.editingModel).toBeNull();

    act(() => {
      renderResult.result.current.setEditLimitsTarget(1);
    });

    expect(renderResult.result.current.editingModel?.modelRefSummary.name).toBe('model-b');
  });
});
