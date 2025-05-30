import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { useMetricColumnNames } from '#~/concepts/pipelines/content/tables/pipelineRun/useMetricColumns';

describe('useMetricColumnNames', () => {
  const experimentId = 'test-experiment-id';
  const localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem');

  beforeEach(() => {
    localStorageGetItemSpy.mockReset();
  });

  it('returns first metric as default value when only 1 metric exists', () => {
    const renderResult = testHook(useMetricColumnNames)(new Set(['metric-1']), experimentId);
    expect(renderResult.result.current).toEqual(['metric-1']);
  });

  it('returns first 2 metrics as default values', () => {
    const renderResult = testHook(useMetricColumnNames)(
      new Set(['metric-1', 'metric-2', 'metric-3']),
      experimentId,
    );

    expect(renderResult.result.current).toEqual(['metric-1', 'metric-2']);
  });

  it('returns no metrics if localStorage columns are set as empty for the experiment', () => {
    localStorageGetItemSpy.mockReturnValue('[]');
    const renderResult = testHook(useMetricColumnNames)(new Set(['metric-1']), experimentId);

    expect(renderResult.result.current).toEqual([]);
  });

  it('returns no metrics if no defaults are available to choose from', () => {
    const renderResult = testHook(useMetricColumnNames)(new Set([]), experimentId);
    expect(renderResult.result.current).toEqual([]);
  });
});
