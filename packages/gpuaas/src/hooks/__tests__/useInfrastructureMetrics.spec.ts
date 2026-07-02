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

describe('useInfrastructureMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call usePrometheusQuery with correct parameters', () => {
    const state: MockFetchState = {
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    };
    setupMocks([state, state, state, state]);

    testHook(useInfrastructureMetrics)();

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
  });

  it('should return loading state when queries have not loaded', () => {
    const state: MockFetchState = {
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    };
    setupMocks([state, state, state, state]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.accelerators).toBeNull();
    expect(renderResult.result.current.computeUtilization).toBeNull();
    expect(renderResult.result.current.memoryUtilization).toBeNull();
  });

  it('should return accelerator metrics when data is available', () => {
    const allocatableData = createPromResponse('16');
    const inUseData = createPromResponse('11');
    const computeData = createPromResponse('1.73');
    const memoryData = createPromResponse('57.68');

    setupMocks([
      { data: allocatableData, loaded: true, error: undefined, refresh: jest.fn() },
      { data: inUseData, loaded: true, error: undefined, refresh: jest.fn() },
      { data: computeData, loaded: true, error: undefined, refresh: jest.fn() },
      { data: memoryData, loaded: true, error: undefined, refresh: jest.fn() },
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.accelerators).toEqual({ total: 16, inUse: 11 });
    expect(renderResult.result.current.computeUtilization).toEqual({ percentage: 2 });
    expect(renderResult.result.current.memoryUtilization).toEqual({ percentage: 58 });
  });

  it('should return null accelerators when allocatable returns empty result', () => {
    setupMocks([
      { data: EMPTY_PROM_RESPONSE, loaded: true, error: undefined, refresh: jest.fn() },
      { data: EMPTY_PROM_RESPONSE, loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('80'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('83'), loaded: true, error: undefined, refresh: jest.fn() },
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toBeNull();
    expect(renderResult.result.current.computeUtilization).toEqual({ percentage: 80 });
    expect(renderResult.result.current.memoryUtilization).toEqual({ percentage: 83 });
  });

  it('should return null utilization when DCGM queries return empty', () => {
    setupMocks([
      { data: createPromResponse('16'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('11'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: EMPTY_PROM_RESPONSE, loaded: true, error: undefined, refresh: jest.fn() },
      { data: EMPTY_PROM_RESPONSE, loaded: true, error: undefined, refresh: jest.fn() },
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
      { data: createPromResponse('NaN'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('11'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('NaN'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('57'), loaded: true, error: undefined, refresh: jest.fn() },
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toBeNull();
    expect(renderResult.result.current.computeUtilization).toBeNull();
    expect(renderResult.result.current.memoryUtilization).toEqual({ percentage: 57 });
  });

  it('should return inUse=0 when allocatable exists but inUse is empty', () => {
    setupMocks([
      { data: createPromResponse('16'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: EMPTY_PROM_RESPONSE, loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('50'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('60'), loaded: true, error: undefined, refresh: jest.fn() },
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toEqual({ total: 16, inUse: 0 });
  });

  it('should round utilization percentages to nearest integer', () => {
    setupMocks([
      { data: createPromResponse('16'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('11'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('79.6'), loaded: true, error: undefined, refresh: jest.fn() },
      { data: createPromResponse('83.2'), loaded: true, error: undefined, refresh: jest.fn() },
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.computeUtilization).toEqual({ percentage: 80 });
    expect(renderResult.result.current.memoryUtilization).toEqual({ percentage: 83 });
  });
});
