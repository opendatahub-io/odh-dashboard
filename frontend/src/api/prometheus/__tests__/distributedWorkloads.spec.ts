import { act } from '@testing-library/react';
import axios from 'axios';
import { mockPrometheusQueryVectorResponse } from '~/__mocks__/mockPrometheusQueryVectorResponse';
import { mockWorkloadK8sResource } from '~/__mocks__/mockWorkloadK8sResource';
import { WorkloadKind } from '~/k8sTypes';
import { getWorkloadOwnerJobName } from '~/concepts/distributedWorkloads/utils';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { POLL_INTERVAL } from '~/utilities/const';
import {
  DWProjectCurrentMetrics,
  TopWorkloadsByUsage,
  WorkloadCurrentUsage,
  WorkloadMetricPromQueryResponse,
  getTopResourceConsumingWorkloads,
  getTotalUsage,
  indexNumericValuesByJobName,
  useDWProjectCurrentMetrics,
} from '~/api/prometheus/distributedWorkloads';

const mockCpuUsageResults: WorkloadMetricPromQueryResponse['data']['result'] = [
  {
    metric: {
      workload: 'test-job-1',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.368, '0.00000150000000000'],
  },
  {
    metric: {
      workload: 'test-job-2',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.368, '0.00000163333333333'],
  },
  {
    metric: {
      workload: 'test-job-3',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.368, '0.0120015'],
  },
  {
    metric: {
      workload: 'test-job-4',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.368, '0.04300163333333333'],
  },
  {
    metric: {
      workload: 'test-job-5',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.368, '0.01100163333333333'],
  },
  {
    metric: {
      workload: 'test-job-6',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.368, '0.01300163333333333'],
  },
  {
    metric: {
      workload: 'test-job-7',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.368, '0.01500163333333333'],
  },
];

const mockMemoryUsageResults: WorkloadMetricPromQueryResponse['data']['result'] = [
  {
    metric: {
      workload: 'test-job-1',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.37, '8237056'],
  },
  {
    metric: {
      workload: 'test-job-2',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.37, '8249344'],
  },
  {
    metric: {
      workload: 'test-job-3',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.37, '9349344'],
  },
  {
    metric: {
      workload: 'test-job-4',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.37, '82493440'],
  },
  {
    metric: {
      workload: 'test-job-5',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.37, '42493440'],
  },
  {
    metric: {
      workload: 'test-job-6',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.37, '8237036'],
  },
  {
    metric: {
      workload: 'test-job-7',
      workload_type: 'job', // eslint-disable-line camelcase
    },
    value: [1711495542.37, '10337050'],
  },
];

const mockWorkloads = [
  mockWorkloadK8sResource({
    k8sName: 'test-job-1-wl',
    namespace: 'test-project',
    ownerJobName: 'test-job-1',
  }),
  mockWorkloadK8sResource({
    k8sName: 'test-job-2-wl',
    namespace: 'test-project',
    ownerJobName: 'test-job-2',
  }),
  mockWorkloadK8sResource({
    k8sName: 'test-job-3-wl',
    namespace: 'test-project',
    ownerJobName: 'test-job-3',
  }),
  mockWorkloadK8sResource({
    k8sName: 'test-job-4-wl',
    namespace: 'test-project',
    ownerJobName: 'test-job-4',
  }),
  mockWorkloadK8sResource({
    k8sName: 'test-job-5-wl',
    namespace: 'test-project',
    ownerJobName: 'test-job-5',
  }),
  mockWorkloadK8sResource({
    k8sName: 'test-job-6-wl',
    namespace: 'test-project',
    ownerJobName: 'test-job-6',
  }),
  mockWorkloadK8sResource({
    k8sName: 'test-job-7-wl',
    namespace: 'test-project',
    ownerJobName: 'test-job-7',
  }),
];

const mockGetWorkloadCurrentUsage = (workload: WorkloadKind): WorkloadCurrentUsage => {
  const jobName = getWorkloadOwnerJobName(workload);
  return {
    cpuCoresUsed: jobName
      ? Number(mockCpuUsageResults.find(({ metric }) => metric.workload === jobName)?.value[1])
      : undefined,
    memoryBytesUsed: jobName
      ? Number(mockMemoryUsageResults.find(({ metric }) => metric.workload === jobName)?.value[1])
      : undefined,
  };
};

describe('indexNumericValuesByJobName', () => {
  it('converts Prometheus response data to an indexed structure', () => {
    const promResponse = mockPrometheusQueryVectorResponse({
      result: mockCpuUsageResults,
    });
    const indexedValues: Record<string, number> = {
      'test-job-1': 0.0000015,
      'test-job-2': 0.00000163333333333,
      'test-job-3': 0.0120015,
      'test-job-4': 0.04300163333333333,
      'test-job-5': 0.01100163333333333,
      'test-job-6': 0.01300163333333333,
      'test-job-7': 0.01500163333333333,
    };
    expect(indexNumericValuesByJobName(promResponse)).toEqual(indexedValues);
  });
});

describe('getTotalUsage', () => {
  it('sums usage properties across objects', () => {
    expect(
      getTotalUsage([
        { workload: mockWorkloads[0], usage: 0.0000015 },
        { workload: mockWorkloads[1], usage: 0.00000163333333333 },
      ]),
    ).toEqual(0.00000313333333333);
  });
});

describe('getTopResourceConsumingWorkloads', () => {
  it('sorts the top 5 workloads and sums remaining as "other" when there are more than 6', () => {
    expect(getTopResourceConsumingWorkloads(mockWorkloads, mockGetWorkloadCurrentUsage)).toEqual({
      cpuCoresUsed: {
        totalUsage: 0.09401116666666666,
        topWorkloads: [
          { workload: mockWorkloads[3], usage: 0.04300163333333333 },
          { workload: mockWorkloads[6], usage: 0.01500163333333333 },
          { workload: mockWorkloads[5], usage: 0.01300163333333333 },
          { workload: mockWorkloads[2], usage: 0.0120015 },
          { workload: mockWorkloads[4], usage: 0.01100163333333333 },
          { workload: 'other', usage: 0.00000313333333333 },
        ],
      },
      memoryBytesUsed: {
        totalUsage: 169396710,
        topWorkloads: [
          { workload: mockWorkloads[3], usage: 82493440 },
          { workload: mockWorkloads[4], usage: 42493440 },
          { workload: mockWorkloads[6], usage: 10337050 },
          { workload: mockWorkloads[2], usage: 9349344 },
          { workload: mockWorkloads[1], usage: 8249344 },
          { workload: 'other', usage: 16474092 },
        ],
      },
    } satisfies TopWorkloadsByUsage);
  });

  it('sorts all workloads and excludes the "other" group when there are exactly 6', () => {
    expect(
      getTopResourceConsumingWorkloads(mockWorkloads.slice(0, 6), mockGetWorkloadCurrentUsage),
    ).toEqual({
      cpuCoresUsed: {
        totalUsage: 0.07900953333333333,
        topWorkloads: [
          { workload: mockWorkloads[3], usage: 0.04300163333333333 },
          { workload: mockWorkloads[5], usage: 0.01300163333333333 },
          { workload: mockWorkloads[2], usage: 0.0120015 },
          { workload: mockWorkloads[4], usage: 0.01100163333333333 },
          { workload: mockWorkloads[1], usage: 0.00000163333333333 },
          { workload: mockWorkloads[0], usage: 0.0000015 },
        ],
      },
      memoryBytesUsed: {
        totalUsage: 159059660,
        topWorkloads: [
          { workload: mockWorkloads[3], usage: 82493440 },
          { workload: mockWorkloads[4], usage: 42493440 },
          { workload: mockWorkloads[2], usage: 9349344 },
          { workload: mockWorkloads[1], usage: 8249344 },
          { workload: mockWorkloads[0], usage: 8237056 },
          { workload: mockWorkloads[5], usage: 8237036 },
        ],
      },
    } satisfies TopWorkloadsByUsage);
  });

  it('sorts all workloads and excludes the "other" group when there are less than 6', () => {
    expect(
      getTopResourceConsumingWorkloads(mockWorkloads.slice(0, 3), mockGetWorkloadCurrentUsage),
    ).toEqual({
      cpuCoresUsed: {
        totalUsage: 0.01200463333333333,
        topWorkloads: [
          { workload: mockWorkloads[2], usage: 0.0120015 },
          { workload: mockWorkloads[1], usage: 0.00000163333333333 },
          { workload: mockWorkloads[0], usage: 0.0000015 },
        ],
      },
      memoryBytesUsed: {
        totalUsage: 25835744,
        topWorkloads: [
          { workload: mockWorkloads[2], usage: 9349344 },
          { workload: mockWorkloads[1], usage: 8249344 },
          { workload: mockWorkloads[0], usage: 8237056 },
        ],
      },
    } satisfies TopWorkloadsByUsage);
  });
});

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.useFakeTimers();
const mockAxios = jest.mocked(axios.post);
const mockCpuResolvedValueOnce = () =>
  mockAxios.mockResolvedValueOnce({
    data: { response: mockPrometheusQueryVectorResponse({ result: mockCpuUsageResults }) },
  });
const mockMemoryResolvedValueOnce = () =>
  mockAxios.mockResolvedValueOnce({
    data: { response: mockPrometheusQueryVectorResponse({ result: mockMemoryUsageResults }) },
  });

describe('useDWProjectCurrentMetrics', () => {
  it('should fetch queries and return indexed values with helpers', async () => {
    mockCpuResolvedValueOnce();
    mockMemoryResolvedValueOnce();

    const renderResult = await testHook(useDWProjectCurrentMetrics)(
      mockWorkloads,
      'test-project',
      POLL_INTERVAL,
    );
    expect(renderResult).hookToStrictEqual({
      data: {
        cpuCoresUsedByJobName: {
          data: {},
          error: undefined,
          loaded: false,
          refresh: expect.any(Function),
        },
        memoryBytesUsedByJobName: {
          data: {},
          error: undefined,
          loaded: false,
          refresh: expect.any(Function),
        },
      },
      refresh: expect.any(Function),
      loaded: false,
      error: undefined,
      getWorkloadCurrentUsage: expect.any(Function),
      topWorkloadsByUsage: {
        cpuCoresUsed: { totalUsage: 0, topWorkloads: [] },
        memoryBytesUsed: { totalUsage: 0, topWorkloads: [] },
      },
    } satisfies DWProjectCurrentMetrics);
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/query', {
      query:
        'namespace=test-project&query=sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster="", namespace="test-project"} * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster="", namespace="test-project", workload_type="job"}) by (workload, workload_type)',
    });
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/query', {
      query:
        'namespace=test-project&query=sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor", cluster="", namespace="test-project", container!="", image!=""} * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster="", namespace="test-project", workload_type="job"}) by (workload, workload_type)',
    });
    expect(renderResult).hookToHaveUpdateCount(1);

    // Wait for update after Prometheus query fetches resolve
    await renderResult.waitForNextUpdate();
    const expectedResult: DWProjectCurrentMetrics = {
      data: {
        cpuCoresUsedByJobName: {
          data: {
            'test-job-1': 0.0000015,
            'test-job-2': 0.00000163333333333,
            'test-job-3': 0.0120015,
            'test-job-4': 0.04300163333333333,
            'test-job-5': 0.01100163333333333,
            'test-job-6': 0.01300163333333333,
            'test-job-7': 0.01500163333333333,
          },
          error: undefined,
          loaded: true,
          refresh: expect.any(Function),
        },
        memoryBytesUsedByJobName: {
          data: {
            'test-job-1': 8237056,
            'test-job-2': 8249344,
            'test-job-3': 9349344,
            'test-job-4': 82493440,
            'test-job-5': 42493440,
            'test-job-6': 8237036,
            'test-job-7': 10337050,
          },
          error: undefined,
          loaded: true,
          refresh: expect.any(Function),
        },
      },
      refresh: expect.any(Function),
      loaded: true,
      error: undefined,
      getWorkloadCurrentUsage: expect.any(Function),
      topWorkloadsByUsage: {
        cpuCoresUsed: {
          topWorkloads: [
            { workload: mockWorkloads[3], usage: 0.04300163333333333 },
            { workload: mockWorkloads[6], usage: 0.01500163333333333 },
            { workload: mockWorkloads[5], usage: 0.01300163333333333 },
            { workload: mockWorkloads[2], usage: 0.0120015 },
            { workload: mockWorkloads[4], usage: 0.01100163333333333 },
            { workload: 'other', usage: 0.00000313333333333 },
          ],
          totalUsage: 0.09401116666666666,
        },
        memoryBytesUsed: {
          topWorkloads: [
            { workload: mockWorkloads[3], usage: 82493440 },
            { workload: mockWorkloads[4], usage: 42493440 },
            { workload: mockWorkloads[6], usage: 10337050 },
            { workload: mockWorkloads[2], usage: 9349344 },
            { workload: mockWorkloads[1], usage: 8249344 },
            { workload: 'other', usage: 16474092 },
          ],
          totalUsage: 169396710,
        },
      },
    };
    expect(renderResult).hookToStrictEqual(expectedResult);
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable(false);

    // Check that we're refetching on an interval
    mockCpuResolvedValueOnce();
    mockMemoryResolvedValueOnce();
    await act(() => {
      jest.advanceTimersByTime(POLL_INTERVAL);
    });
    expect(renderResult).hookToStrictEqual(expectedResult);
    expect(mockAxios).toHaveBeenCalledTimes(4);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable(false);

    // Check that the refresh function refetches both Prometheus queries
    mockCpuResolvedValueOnce();
    mockMemoryResolvedValueOnce();
    renderResult.result.current.refresh();
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(6);
    expect(renderResult).hookToHaveUpdateCount(4);
  });

  it('should handle errors and return first error found', async () => {
    // Both queries erroring at first
    mockAxios.mockRejectedValueOnce(new Error('cpuQueryError'));
    mockAxios.mockRejectedValueOnce(new Error('memoryQueryError'));
    const renderResult = await testHook(useDWProjectCurrentMetrics)(
      mockWorkloads,
      'test-project',
      POLL_INTERVAL,
    );
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(1);
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult.result.current.error?.message).toBe('cpuQueryError');

    // Manual refetch with only second query erroring
    mockCpuResolvedValueOnce();
    mockAxios.mockRejectedValueOnce(new Error('memoryQueryError'));
    renderResult.result.current.refresh();
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(4);
    expect(renderResult).hookToHaveUpdateCount(4);
    expect(renderResult.result.current.error?.message).toBe('memoryQueryError');

    // Automatic refetch with only first query erroring
    mockAxios.mockRejectedValueOnce(new Error('cpuQueryError'));
    mockMemoryResolvedValueOnce();
    await act(() => {
      jest.advanceTimersByTime(POLL_INTERVAL);
    });
    expect(mockAxios).toHaveBeenCalledTimes(6);
    expect(renderResult).hookToHaveUpdateCount(5);
    expect(renderResult.result.current.error?.message).toBe('cpuQueryError');
  });

  it('should return a getWorkloadCurrentUsage that returns the correct values', async () => {
    mockCpuResolvedValueOnce();
    mockMemoryResolvedValueOnce();

    const renderResult = await testHook(useDWProjectCurrentMetrics)(
      mockWorkloads,
      'test-project',
      POLL_INTERVAL,
    );
    await renderResult.waitForNextUpdate();

    const { getWorkloadCurrentUsage } = renderResult.result.current;

    expect(getWorkloadCurrentUsage(mockWorkloads[0])).toEqual({
      cpuCoresUsed: 0.0000015,
      memoryBytesUsed: 8237056,
    } satisfies WorkloadCurrentUsage);
    expect(getWorkloadCurrentUsage(mockWorkloads[1])).toEqual({
      cpuCoresUsed: 0.00000163333333333,
      memoryBytesUsed: 8249344,
    } satisfies WorkloadCurrentUsage);
    expect(getWorkloadCurrentUsage(mockWorkloads[2])).toEqual({
      cpuCoresUsed: 0.0120015,
      memoryBytesUsed: 9349344,
    } satisfies WorkloadCurrentUsage);
    expect(getWorkloadCurrentUsage(mockWorkloads[3])).toEqual({
      cpuCoresUsed: 0.04300163333333333,
      memoryBytesUsed: 82493440,
    } satisfies WorkloadCurrentUsage);
    expect(getWorkloadCurrentUsage(mockWorkloads[4])).toEqual({
      cpuCoresUsed: 0.01100163333333333,
      memoryBytesUsed: 42493440,
    } satisfies WorkloadCurrentUsage);
    expect(getWorkloadCurrentUsage(mockWorkloads[5])).toEqual({
      cpuCoresUsed: 0.01300163333333333,
      memoryBytesUsed: 8237036,
    } satisfies WorkloadCurrentUsage);
    expect(getWorkloadCurrentUsage(mockWorkloads[6])).toEqual({
      cpuCoresUsed: 0.01500163333333333,
      memoryBytesUsed: 10337050,
    } satisfies WorkloadCurrentUsage);
  });
});
