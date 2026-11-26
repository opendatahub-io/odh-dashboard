import * as React from 'react';
import { act } from '@testing-library/react';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { reindexAfterRemove, useSubscriptionModels } from '~/app/hooks/useSubscriptionModels';
import { MaaSModelRefSummary, SubscriptionModelEntry } from '~/app/types/subscriptions';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

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

describe('reindexAfterRemove', () => {
  it('returns null when the edited row was removed', () => {
    expect(reindexAfterRemove(1, [1])).toBeNull();
  });

  it('decrements the target when rows above it were removed', () => {
    expect(reindexAfterRemove(2, [0])).toBe(1);
    expect(reindexAfterRemove(3, [1, 2])).toBe(1);
  });

  it('leaves the target unchanged when only rows below it were removed', () => {
    expect(reindexAfterRemove(0, [2])).toBe(0);
  });
});

describe('useSubscriptionModels', () => {
  const renderState = (initial?: SubscriptionModelEntry[], trackEvent = jest.fn()) => ({
    trackEvent,
    renderResult: renderHook(() => useSubscriptionModels(initial), {
      wrapper: ({ children }) => (
        <TrackingProvider trackEvent={trackEvent}>{children}</TrackingProvider>
      ),
    }),
  });

  it('should initialize with empty models by default', () => {
    const { renderResult } = renderState();
    const { models, allModelsHaveRateLimits } = renderResult.result.current;

    expect(models).toHaveLength(0);
    expect(allModelsHaveRateLimits).toBe(true);
  });

  it('should initialize with provided models', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b')];
    const { renderResult } = renderState(initial);

    expect(renderResult.result.current.models).toHaveLength(2);
    expect(renderResult.result.current.models[0].modelRefSummary.name).toBe('model-a');
    expect(renderResult.result.current.allModelsHaveRateLimits).toBe(true);
  });

  it('should add models via handleAddModels', () => {
    const { renderResult } = renderState();

    act(() => {
      renderResult.result.current.handleAddModels([makeModelRef('model-a')]);
    });

    expect(renderResult.result.current.models).toHaveLength(1);
    expect(renderResult.result.current.models[0].modelRefSummary.name).toBe('model-a');
    expect(renderResult.result.current.models[0].tokenRateLimits).toEqual([]);
  });

  it('should not add duplicate models', () => {
    const initial = [makeEntry('model-a')];
    const { renderResult } = renderState(initial);

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
    const { renderResult } = renderState(initial);

    act(() => {
      renderResult.result.current.handleRemoveModel(1);
    });

    expect(renderResult.result.current.models).toHaveLength(2);
    expect(renderResult.result.current.models[0].modelRefSummary.name).toBe('model-a');
    expect(renderResult.result.current.models[1].modelRefSummary.name).toBe('model-c');
  });

  it('should reindex editLimitsTarget when a row above the target is removed', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b'), makeEntry('model-c')];
    const { renderResult } = renderState(initial);

    act(() => {
      renderResult.result.current.setEditLimitsTarget(2);
    });
    act(() => {
      renderResult.result.current.handleRemoveModel(0);
    });

    expect(renderResult.result.current.editLimitsTarget).toBe(1);
    expect(renderResult.result.current.editingModel?.modelRefSummary.name).toBe('model-c');
  });

  it('should clear editLimitsTarget when the edited row is removed', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b')];
    const { renderResult } = renderState(initial);

    act(() => {
      renderResult.result.current.setEditLimitsTarget(1);
    });
    act(() => {
      renderResult.result.current.handleRemoveModel(1);
    });

    expect(renderResult.result.current.editLimitsTarget).toBeNull();
    expect(renderResult.result.current.editingModel).toBeNull();
  });

  it('should adjust editLimitsTarget when removing multiple models by ref', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b'), makeEntry('model-c')];
    const { renderResult } = renderState(initial);

    act(() => {
      renderResult.result.current.setEditLimitsTarget(2);
    });
    act(() => {
      renderResult.result.current.handleRemoveModelsByRef([
        makeModelRef('model-a'),
        makeModelRef('model-b'),
      ]);
    });

    expect(renderResult.result.current.models).toHaveLength(1);
    expect(renderResult.result.current.editLimitsTarget).toBe(0);
    expect(renderResult.result.current.editingModel?.modelRefSummary.name).toBe('model-c');
  });

  it('should remove models by ref', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b'), makeEntry('model-c')];
    const { renderResult } = renderState(initial);

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
    const { renderResult } = renderState(initial);

    act(() => {
      renderResult.result.current.setEditLimitsTarget(0);
    });

    const newLimits = [{ limit: 50000, window: '1h' }];
    act(() => {
      renderResult.result.current.handleSaveRateLimits(newLimits);
    });

    expect(renderResult.result.current.models[0].tokenRateLimits).toEqual(newLimits);
    expect(renderResult.result.current.models[1].tokenRateLimits).toEqual([]);
    expect(renderResult.result.current.editLimitsTarget).toBeNull();
  });

  it('should report allModelsHaveRateLimits correctly', () => {
    const { renderResult } = renderState([
      makeEntry('model-a', 'ns', [{ limit: 1000, window: '1h' }]),
    ]);

    expect(renderResult.result.current.allModelsHaveRateLimits).toBe(true);

    act(() => {
      renderResult.result.current.handleAddModels([makeModelRef('model-b')]);
    });

    // false as soon as a model with no limits is added
    expect(renderResult.result.current.allModelsHaveRateLimits).toBe(false);
    expect(renderResult.result.current.models).toHaveLength(2);

    // also false when initialized with a model that already has no limits
    const renderResult2 = renderState([makeEntry('model-a', 'ns', [])]).renderResult;
    expect(renderResult2.result.current.allModelsHaveRateLimits).toBe(false);
  });

  it('should return the editingModel when editLimitsTarget is set', () => {
    const initial = [makeEntry('model-a'), makeEntry('model-b')];
    const { renderResult } = renderState(initial);

    expect(renderResult.result.current.editingModel).toBeNull();

    act(() => {
      renderResult.result.current.setEditLimitsTarget(1);
    });

    expect(renderResult.result.current.editingModel?.modelRefSummary.name).toBe('model-b');
  });

  it('should track token-limit save and cancel through the injected callback', () => {
    const initial = [makeEntry('model-a', 'ns', [])];
    const { renderResult, trackEvent } = renderState(initial);

    act(() => {
      renderResult.result.current.setEditLimitsTarget(0);
    });
    act(() => {
      renderResult.result.current.handleSaveRateLimits([
        { limit: 50000, window: '1h' },
        { limit: 1000, window: '24h' },
      ]);
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Subscription Token Limits Configured', {
      outcome: 'submit',
      limitCount: 2,
    });

    act(() => {
      renderResult.result.current.setEditLimitsTarget(0);
    });
    act(() => {
      renderResult.result.current.handleCloseRateLimitsModal();
    });
    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent).toHaveBeenLastCalledWith('Subscription Token Limits Configured', {
      outcome: 'cancel',
    });
  });
});
