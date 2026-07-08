import { testHook } from '@odh-dashboard/jest-config/hooks';
import usePrometheusQuery from '@odh-dashboard/internal/api/prometheus/usePrometheusQuery';
import { PrometheusQueryResponse } from '@odh-dashboard/internal/types';
import useInfrastructureMetrics from '../useInfrastructureMetrics';
import {
  INFRASTRUCTURE_REFRESH_INTERVAL,
  PROMQL_ACCELERATOR_ALLOCATABLE,
  PROMQL_ACCELERATOR_IN_USE,
  PROMQL_COMPUTE_UTILIZATION,
  PROMQL_MEMORY_UTILIZATION,
} from '../../const';

jest.mock('@odh-dashboard/internal/api/prometheus/usePrometheusQuery', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const usePrometheusQueryMock = jest.mocked(usePrometheusQuery);

const createPromResponse = (value: string): PrometheusQueryResponse => ({
  data: {
    result: [{ value: [Date.now() / 1000, value] }],
    resultType: 'vector',
  },
  status: 'success',
});

const EMPTY_PROM_RESPONSE: PrometheusQueryResponse = {
  data: { result: [], resultType: 'vector' },
  status: 'success',
};

type MockFetchState = {
  data: PrometheusQueryResponse | null;
  loaded: boolean;
  error?: Error;
  refresh: jest.Mock;
};

const setupMocks = (states: [MockFetchState, MockFetchState, MockFetchState, MockFetchState]) => {
  let callIdx = 0;
  usePrometheusQueryMock.mockImplementation(() => {
    const state = states[callIdx % 4];
    callIdx++;
    return state;
  });
};

const loadedState = (data: PrometheusQueryResponse): MockFetchState => ({
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

describe('useInfrastructureMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call usePrometheusQuery with correct parameters and return loading state initially', () => {
    setupMocks([unloadedState, unloadedState, unloadedState, unloadedState]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(usePrometheusQueryMock).toHaveBeenCalledTimes(4);
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      1,
      '/api/prometheus/query',
      PROMQL_ACCELERATOR_ALLOCATABLE,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      2,
      '/api/prometheus/query',
      PROMQL_ACCELERATOR_IN_USE,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      3,
      '/api/prometheus/query',
      PROMQL_COMPUTE_UTILIZATION,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      4,
      '/api/prometheus/query',
      PROMQL_MEMORY_UTILIZATION,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.accelerators).toBeNull();
    expect(renderResult.result.current.computeUtilization).toBeNull();
    expect(renderResult.result.current.memoryUtilization).toBeNull();
  });

  it.each([
    {
      label: 'returns parsed and rounded metrics for all queries',
      allocatable: '16',
      inUse: '11',
      compute: '79.6',
      memory: '83.2',
      expectedAccel: { total: 16, inUse: 11 },
      expectedCompute: { percentage: 80 },
      expectedMemory: { percentage: 83 },
    },
    {
      label: 'rounds down small utilization values',
      allocatable: '30',
      inUse: '28',
      compute: '1.73',
      memory: '57.68',
      expectedAccel: { total: 30, inUse: 28 },
      expectedCompute: { percentage: 2 },
      expectedMemory: { percentage: 58 },
    },
  ])(
    'should return correct metrics: $label',
    ({ allocatable, inUse, compute, memory, expectedAccel, expectedCompute, expectedMemory }) => {
      setupMocks([
        loadedState(createPromResponse(allocatable)),
        loadedState(createPromResponse(inUse)),
        loadedState(createPromResponse(compute)),
        loadedState(createPromResponse(memory)),
      ]);

      const renderResult = testHook(useInfrastructureMetrics)();

      expect(renderResult.result.current.loaded).toBe(true);
      expect(renderResult.result.current.accelerators).toEqual(expectedAccel);
      expect(renderResult.result.current.computeUtilization).toEqual(expectedCompute);
      expect(renderResult.result.current.memoryUtilization).toEqual(expectedMemory);
    },
  );

  it('should return null accelerators when allocatable returns empty result', () => {
    setupMocks([
      loadedState(EMPTY_PROM_RESPONSE),
      loadedState(EMPTY_PROM_RESPONSE),
      loadedState(createPromResponse('80')),
      loadedState(createPromResponse('83')),
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toBeNull();
    expect(renderResult.result.current.computeUtilization).toEqual({ percentage: 80 });
    expect(renderResult.result.current.memoryUtilization).toEqual({ percentage: 83 });
  });

  it('should return null utilization when DCGM queries return empty', () => {
    setupMocks([
      loadedState(createPromResponse('16')),
      loadedState(createPromResponse('11')),
      loadedState(EMPTY_PROM_RESPONSE),
      loadedState(EMPTY_PROM_RESPONSE),
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toEqual({ total: 16, inUse: 11 });
    expect(renderResult.result.current.computeUtilization).toBeNull();
    expect(renderResult.result.current.memoryUtilization).toBeNull();
  });

  it('should set loaded=true when any query has an error', () => {
    const testError = new Error('Prometheus call error');
    setupMocks([
      { data: null, loaded: true, error: undefined, refresh: jest.fn() },
      { data: null, loaded: true, error: undefined, refresh: jest.fn() },
      { data: null, loaded: true, error: undefined, refresh: jest.fn() },
      { data: null, loaded: false, error: testError, refresh: jest.fn() },
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBe(testError);
  });

  it('should handle NaN values gracefully', () => {
    setupMocks([
      loadedState(createPromResponse('NaN')),
      loadedState(createPromResponse('11')),
      loadedState(createPromResponse('NaN')),
      loadedState(createPromResponse('57')),
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toBeNull();
    expect(renderResult.result.current.computeUtilization).toBeNull();
    expect(renderResult.result.current.memoryUtilization).toEqual({ percentage: 57 });
  });

  it('should clamp inUse to total and default to 0 when inUse is empty', () => {
    setupMocks([
      loadedState(createPromResponse('16')),
      loadedState(EMPTY_PROM_RESPONSE),
      loadedState(createPromResponse('50')),
      loadedState(createPromResponse('60')),
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toEqual({ total: 16, inUse: 0 });
  });
});
