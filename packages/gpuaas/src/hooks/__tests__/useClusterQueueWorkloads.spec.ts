import { testHook } from '@odh-dashboard/jest-config/hooks';
import { QuotaUsageWorkloadStatuses, QuotaUsageWorkloadTypes } from '../../types';
import useClusterQueueWorkloads from '../useClusterQueueWorkloads';
import useWorkloadRows from '../useWorkloadRows';

jest.mock('../useWorkloadRows', () => jest.fn());

const useWorkloadRowsMock = jest.mocked(useWorkloadRows);

describe('useClusterQueueWorkloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches workloads for the selected cluster queue only', () => {
    const workloads = [
      {
        name: 'wl-1',
        namespace: 'dsp-1',
        project: 'dsp-1',
        clusterQueue: 'gpu-cq',
        type: QuotaUsageWorkloadTypes.Workbench,
        status: QuotaUsageWorkloadStatuses.Queued,
        localQueue: 'user-queue',
        accelerators: 1,
        queuePosition: 2,
      },
    ];

    useWorkloadRowsMock.mockReturnValue({
      data: {
        mode: 'clusterQueues',
        workloadsByClusterQueue: new Map([['gpu-cq', workloads]]),
      },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueWorkloads)('gpu-cq');
    expect(useWorkloadRowsMock).toHaveBeenCalledWith(
      { mode: 'clusterQueues', clusterQueueNames: ['gpu-cq'] },
      {},
    );
    expect(renderResult.result.current.workloads).toEqual(workloads);
    expect(renderResult.result.current.isEmpty).toBe(false);
  });

  it('skips fetch when clusterQueueName is undefined', () => {
    useWorkloadRowsMock.mockReturnValue({
      data: { mode: 'clusterQueues', workloadsByClusterQueue: new Map() },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueWorkloads)(undefined);
    expect(useWorkloadRowsMock).toHaveBeenCalledWith(
      { mode: 'clusterQueues', clusterQueueNames: [] },
      {},
    );
    expect(renderResult.result.current.workloads).toEqual([]);
    expect(renderResult.result.current.isEmpty).toBe(true);
  });
});
