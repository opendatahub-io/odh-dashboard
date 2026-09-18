import { testHook } from '@odh-dashboard/jest-config/hooks';
import usePrometheusQuery from '@odh-dashboard/internal/api/prometheus/usePrometheusQuery';
import useCQDcgmMetrics, { parseByModel } from '../useCQDcgmMetrics';
import {
  INFRASTRUCTURE_REFRESH_INTERVAL,
  PROMETHEUS_CLUSTER_QUERY_PATH,
  PROMQL_COMPUTE_BY_MODEL,
  PROMQL_MEMORY_BY_MODEL,
} from '../../const';

jest.mock('@odh-dashboard/internal/api/prometheus/usePrometheusQuery', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const usePrometheusQueryMock = jest.mocked(usePrometheusQuery);

type MockResponse = Parameters<typeof parseByModel>[0];

type MockFetchState = {
  data: MockResponse;
  loaded: boolean;
  error?: Error;
  refresh: jest.Mock;
};

const makeResponse = (results: Array<{ modelName?: string; value: string }>): MockResponse =>
  ({
    data: {
      result: results.map(({ modelName, value }) => ({
        metric: modelName ? { modelName } : {},
        value: [0, value],
      })),
    },
  } as MockResponse);

const loadedState = (data: MockResponse): MockFetchState => ({
  data,
  loaded: true,
  error: undefined,
  refresh: jest.fn(),
});

const unloadedState: MockFetchState = {
  data: null,
  loaded: false,
  error: undefined,
  refresh: jest.fn(),
};

const setupDcgmMocks = (compute: MockFetchState, memory: MockFetchState) => {
  let callIdx = 0;
  usePrometheusQueryMock.mockImplementation(() => {
    callIdx += 1;
    return callIdx === 1 ? compute : memory;
  });
};

describe('parseByModel', () => {
  it('returns empty map for null response', () => {
    expect(parseByModel(null).size).toBe(0);
  });

  it('returns empty map when result array is empty', () => {
    expect(parseByModel(makeResponse([])).size).toBe(0);
  });

  it('ignores entries missing modelName label', () => {
    const response = makeResponse([{ value: '50' }]);
    expect(parseByModel(response).size).toBe(0);
  });

  it.each([
    ['42.7', 43],
    ['18.0', 18],
    ['99.5', 100],
    ['0.4', 0],
  ])('rounds value "%s" → %d', (raw, rounded) => {
    const map = parseByModel(makeResponse([{ modelName: 'Tesla T4', value: raw }]));
    expect(map.get('tesla t4')).toBe(rounded);
  });

  it('ignores NaN values', () => {
    const map = parseByModel(makeResponse([{ modelName: 'bad-model', value: 'not-a-number' }]));
    expect(map.size).toBe(0);
  });

  it('normalises modelName keys — DCGM space format → lowercase with spaces', () => {
    const map = parseByModel(makeResponse([{ modelName: 'NVIDIA A100-SXM4-80GB', value: '42' }]));
    expect(map.has('nvidia a100 sxm4 80gb')).toBe(true);
    expect(map.get('nvidia a100 sxm4 80gb')).toBe(42);
  });

  it('parses multiple models into the same map', () => {
    const map = parseByModel(
      makeResponse([
        { modelName: 'Tesla T4', value: '30' },
        { modelName: 'NVIDIA A100', value: '75' },
      ]),
    );
    expect(map.get('tesla t4')).toBe(30);
    expect(map.get('nvidia a100')).toBe(75);
  });
});

describe('useCQDcgmMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should query compute and memory Prometheus endpoints with refresh interval', () => {
    setupDcgmMocks(unloadedState, unloadedState);

    testHook(useCQDcgmMetrics)();

    expect(usePrometheusQueryMock).toHaveBeenCalledTimes(2);
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      1,
      PROMETHEUS_CLUSTER_QUERY_PATH,
      PROMQL_COMPUTE_BY_MODEL,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      2,
      PROMETHEUS_CLUSTER_QUERY_PATH,
      PROMQL_MEMORY_BY_MODEL,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );
  });

  it('should stay unloaded until both queries settle', () => {
    setupDcgmMocks(loadedState(makeResponse([])), unloadedState);

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should mark loaded when both queries settle via success or error', () => {
    const computeError = new Error('compute failed');
    setupDcgmMocks(
      { data: null, loaded: false, error: computeError, refresh: jest.fn() },
      loadedState(makeResponse([])),
    );

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBe(computeError);
  });

  it('should stay unloaded when only one side has settled', () => {
    const computeError = new Error('compute failed');
    setupDcgmMocks(
      { data: null, loaded: false, error: computeError, refresh: jest.fn() },
      unloadedState,
    );

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should merge compute and memory percentages by normalized model key', () => {
    setupDcgmMocks(
      loadedState(makeResponse([{ modelName: 'NVIDIA H100', value: '72.4' }])),
      loadedState(makeResponse([{ modelName: 'NVIDIA H100', value: '65.1' }])),
    );

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.byModel.get('nvidia h100')).toEqual({
      computePercentage: 72,
      memoryPercentage: 65,
    });
    expect(renderResult.result.current.dcgmAvailable).toBe(true);
  });

  it('should keep memory percentage null while memory query is still loading', () => {
    setupDcgmMocks(
      loadedState(makeResponse([{ modelName: 'NVIDIA A100', value: '40' }])),
      unloadedState,
    );

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.byModel.get('nvidia a100')).toEqual({
      computePercentage: 40,
      memoryPercentage: null,
    });
  });

  it('should use undefined for a settled metric missing from one query', () => {
    setupDcgmMocks(
      loadedState(makeResponse([{ modelName: 'NVIDIA A100', value: '72' }])),
      loadedState(makeResponse([])),
    );

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.byModel.get('nvidia a100')).toEqual({
      computePercentage: 72,
      memoryPercentage: undefined,
    });
  });

  it('should report dcgmAvailable false when both queries return no models', () => {
    setupDcgmMocks(loadedState(makeResponse([])), loadedState(makeResponse([])));

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.dcgmAvailable).toBe(false);
    expect(renderResult.result.current.byModel.size).toBe(0);
  });

  it('should surface memory query errors', () => {
    const memoryError = new Error('memory failed');
    setupDcgmMocks(loadedState(makeResponse([])), {
      data: null,
      loaded: true,
      error: memoryError,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useCQDcgmMetrics)();
    expect(renderResult.result.current.error).toBe(memoryError);
  });

  it('should refresh both Prometheus queries', async () => {
    const refreshCompute = jest.fn().mockResolvedValue(null);
    const refreshMemory = jest.fn().mockResolvedValue(null);
    setupDcgmMocks(
      { ...loadedState(makeResponse([])), refresh: refreshCompute },
      { ...loadedState(makeResponse([])), refresh: refreshMemory },
    );

    const renderResult = testHook(useCQDcgmMetrics)();
    await renderResult.result.current.refresh();

    expect(refreshCompute).toHaveBeenCalledTimes(1);
    expect(refreshMemory).toHaveBeenCalledTimes(1);
  });
});
