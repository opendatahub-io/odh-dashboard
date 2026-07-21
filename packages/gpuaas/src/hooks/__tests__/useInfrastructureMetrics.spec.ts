import { testHook } from '@odh-dashboard/jest-config/hooks';
import usePrometheusQuery from '@odh-dashboard/internal/api/prometheus/usePrometheusQuery';
import { PrometheusQueryResponse } from '@odh-dashboard/internal/types';
import useInfrastructureMetrics from '../useInfrastructureMetrics';
import {
  INFRASTRUCTURE_REFRESH_INTERVAL,
  PROMQL_ACCELERATOR_ALLOCATABLE,
  PROMQL_ACCELERATOR_IN_USE,
  PROMQL_COMPUTE_UTILIZATION,
  PROMQL_HARDWARE_IN_USE,
  PROMQL_HARDWARE_NODE_LABELS,
  PROMQL_HARDWARE_TOTAL,
  PROMQL_MEMORY_UTILIZATION,
} from '../../const';

jest.mock('@odh-dashboard/internal/api/prometheus/usePrometheusQuery', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const usePrometheusQueryMock = jest.mocked(usePrometheusQuery);

const QUERY_COUNT = 7;

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

const DEFAULT_LOADED_STATE = loadedState(EMPTY_PROM_RESPONSE);

const setupMocks = (states: MockFetchState[]) => {
  let callIdx = 0;
  usePrometheusQueryMock.mockImplementation(() => {
    const state = states[callIdx % states.length];
    callIdx++;
    return state;
  });
};

const setupClusterMocks = (
  cluster: [MockFetchState, MockFetchState, MockFetchState, MockFetchState],
  hardware: [MockFetchState, MockFetchState, MockFetchState] = [
    DEFAULT_LOADED_STATE,
    DEFAULT_LOADED_STATE,
    DEFAULT_LOADED_STATE,
  ],
) => {
  setupMocks([...cluster, ...hardware]);
};

describe('useInfrastructureMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call usePrometheusQuery with correct parameters and return loading state initially', () => {
    setupMocks(Array(QUERY_COUNT).fill(unloadedState));

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(usePrometheusQueryMock).toHaveBeenCalledTimes(QUERY_COUNT);
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
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      5,
      '/api/prometheus/query',
      PROMQL_HARDWARE_TOTAL,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      6,
      '/api/prometheus/query',
      PROMQL_HARDWARE_IN_USE,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );
    expect(usePrometheusQueryMock).toHaveBeenNthCalledWith(
      7,
      '/api/prometheus/query',
      PROMQL_HARDWARE_NODE_LABELS,
      expect.objectContaining({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }),
    );

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.accelerators).toBeNull();
    expect(renderResult.result.current.computeUtilization).toBeNull();
    expect(renderResult.result.current.memoryUtilization).toBeNull();
    expect(renderResult.result.current.hardwareUsage).toBeNull();
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
      setupClusterMocks([
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
    setupClusterMocks([
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
    setupClusterMocks([
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
      DEFAULT_LOADED_STATE,
      DEFAULT_LOADED_STATE,
      DEFAULT_LOADED_STATE,
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBe(testError);
  });

  it('should handle NaN values gracefully', () => {
    setupClusterMocks([
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
    setupClusterMocks([
      loadedState(createPromResponse('16')),
      loadedState(EMPTY_PROM_RESPONSE),
      loadedState(createPromResponse('50')),
      loadedState(createPromResponse('60')),
    ]);

    const renderResult = testHook(useInfrastructureMetrics)();

    expect(renderResult.result.current.accelerators).toEqual({ total: 16, inUse: 0 });
  });

  describe('hardware usage', () => {
    const createHwResponse = (
      models: { modelName: string; count: string }[],
    ): PrometheusQueryResponse => ({
      data: {
        result: models.map(({ modelName, count }) => ({
          metric: { modelName },
          value: [Date.now() / 1000, count],
        })),
        resultType: 'vector',
      },
      status: 'success',
    });

    const NODE_LABEL_KEY = 'label_nvidia_com_gpu_product';
    const createNodeLabelResponse = (
      models: { label: string; count: string }[],
    ): PrometheusQueryResponse => ({
      data: {
        result: models.map(({ label, count }) => ({
          metric: { [NODE_LABEL_KEY]: label },
          value: [Date.now() / 1000, count],
        })),
        resultType: 'vector',
      },
      status: 'success',
    });

    it('should parse DCGM hardware data into per-model breakdown', () => {
      const hwTotalData = createHwResponse([
        { modelName: 'NVIDIA H100', count: '8' },
        { modelName: 'NVIDIA A100', count: '12' },
      ]);
      const hwInUseData = createHwResponse([
        { modelName: 'NVIDIA H100', count: '8' },
        { modelName: 'NVIDIA A100', count: '10' },
      ]);

      setupMocks([
        ...Array(4).fill(DEFAULT_LOADED_STATE),
        loadedState(hwTotalData),
        loadedState(hwInUseData),
        DEFAULT_LOADED_STATE,
      ]);

      const renderResult = testHook(useInfrastructureMetrics)();

      expect(renderResult.result.current.hardwareUsage).toEqual([
        { modelName: 'NVIDIA A100', inUse: 10, available: 2 },
        { modelName: 'NVIDIA H100', inUse: 8, available: 0 },
      ]);
    });

    it('should fall back to node labels when DCGM is empty', () => {
      const nodeLabelData = createNodeLabelResponse([
        { label: 'NVIDIA L40S', count: '4' },
        { label: 'AMD MI300X', count: '2' },
      ]);

      setupMocks([
        ...Array(4).fill(DEFAULT_LOADED_STATE),
        loadedState(EMPTY_PROM_RESPONSE),
        loadedState(EMPTY_PROM_RESPONSE),
        loadedState(nodeLabelData),
      ]);

      const renderResult = testHook(useInfrastructureMetrics)();

      expect(renderResult.result.current.hardwareUsage).toEqual([
        { modelName: 'NVIDIA L40S', inUse: 0, available: 4 },
        { modelName: 'AMD MI300X', inUse: 0, available: 2 },
      ]);
    });

    it('should return null when no hardware data is available', () => {
      setupMocks([
        ...Array(4).fill(DEFAULT_LOADED_STATE),
        loadedState(EMPTY_PROM_RESPONSE),
        loadedState(EMPTY_PROM_RESPONSE),
        loadedState(EMPTY_PROM_RESPONSE),
      ]);

      const renderResult = testHook(useInfrastructureMetrics)();

      expect(renderResult.result.current.hardwareUsage).toBeNull();
    });

    it('should cap inUse at total when in-use exceeds total', () => {
      const hwTotalData = createHwResponse([{ modelName: 'NVIDIA A100', count: '8' }]);
      const hwInUseData = createHwResponse([{ modelName: 'NVIDIA A100', count: '10' }]);

      setupMocks([
        ...Array(4).fill(DEFAULT_LOADED_STATE),
        loadedState(hwTotalData),
        loadedState(hwInUseData),
        DEFAULT_LOADED_STATE,
      ]);

      const renderResult = testHook(useInfrastructureMetrics)();

      expect(renderResult.result.current.hardwareUsage).toEqual([
        { modelName: 'NVIDIA A100', inUse: 8, available: 0 },
      ]);
    });
  });
});
