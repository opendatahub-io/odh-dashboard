import { testHook } from '@odh-dashboard/jest-config/hooks';
import { getPendingWorkloads } from '#~/api/k8s/pendingWorkloads';
import { KueueWorkloadStatus, KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import { useQueuePositions } from '#~/pages/projects/notebook/useQueuePositions';
import { PendingWorkload } from '#~/k8sTypes';

jest.mock('#~/api/k8s/pendingWorkloads', () => ({
  getPendingWorkloads: jest.fn(),
}));

const getPendingWorkloadsMock = jest.mocked(getPendingWorkloads);

function makeStatus(
  status: KueueWorkloadStatus,
  queueName?: string,
  workloadName?: string,
): KueueWorkloadStatusWithMessage {
  return { status, queueName, workloadName };
}

function mockPendingWorkload(
  name: string,
  namespace: string,
  positionInLocalQueue: number,
  positionInClusterQueue = positionInLocalQueue,
): PendingWorkload {
  return {
    metadata: { name, namespace },
    priority: 0,
    localQueueName: 'user-queue',
    positionInClusterQueue,
    positionInLocalQueue,
  };
}

describe('useQueuePositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[string, string | undefined, Record<string, KueueWorkloadStatusWithMessage | null>]>([
    [
      'namespace is undefined',
      undefined,
      { nb1: makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-1') },
    ],
    [
      'status is not pending',
      'test-ns',
      {
        nb1: makeStatus(KueueWorkloadStatus.Running, 'user-queue', 'wl-1'),
        nb2: null as KueueWorkloadStatusWithMessage | null,
      },
    ],
    [
      'queueName is missing',
      'test-ns',
      { nb1: makeStatus(KueueWorkloadStatus.Queued, undefined, 'wl-1') },
    ],
    [
      'workloadName is missing',
      'test-ns',
      { nb1: makeStatus(KueueWorkloadStatus.Queued, 'user-queue', undefined) },
    ],
  ])('should return empty map and not fetch when %s', (_, ns, statusMap) => {
    const renderResult = testHook(useQueuePositions)(ns, statusMap);
    expect(renderResult).hookToStrictEqual({});
    expect(getPendingWorkloadsMock).not.toHaveBeenCalled();
  });

  it('should fetch positions for Queued workloads', async () => {
    getPendingWorkloadsMock.mockResolvedValue({
      items: [mockPendingWorkload('wl-1', 'test-ns', 0)],
    });

    const statusMap = {
      nb1: makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-1'),
    };
    const renderResult = testHook(useQueuePositions)('test-ns', statusMap);

    await renderResult.waitForNextUpdate();

    expect(getPendingWorkloadsMock).toHaveBeenCalledWith('test-ns', 'user-queue');
    expect(renderResult).hookToStrictEqual({ nb1: 1 });
  });

  it('should fetch positions for Inadmissible workloads', async () => {
    getPendingWorkloadsMock.mockResolvedValue({
      items: [mockPendingWorkload('wl-inadm', 'test-ns', 1, 2)],
    });

    const statusMap = {
      nb1: makeStatus(KueueWorkloadStatus.Inadmissible, 'user-queue', 'wl-inadm'),
    };
    const renderResult = testHook(useQueuePositions)('test-ns', statusMap);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({ nb1: 2 });
  });

  it('should return 1-indexed positions', async () => {
    getPendingWorkloadsMock.mockResolvedValue({
      items: [mockPendingWorkload('wl-1', 'test-ns', 0), mockPendingWorkload('wl-2', 'test-ns', 1)],
    });

    const statusMap = {
      nb1: makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-1'),
      nb2: makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-2'),
    };
    const renderResult = testHook(useQueuePositions)('test-ns', statusMap);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({ nb1: 1, nb2: 2 });
  });

  it('should batch requests by queue name', async () => {
    getPendingWorkloadsMock.mockImplementation(async (_ns, queueName) => {
      if (queueName === 'queue-a') {
        return { items: [mockPendingWorkload('wl-1', 'test-ns', 0)] };
      }
      return { items: [mockPendingWorkload('wl-2', 'test-ns', 0)] };
    });

    const statusMap = {
      nb1: makeStatus(KueueWorkloadStatus.Queued, 'queue-a', 'wl-1'),
      nb2: makeStatus(KueueWorkloadStatus.Queued, 'queue-b', 'wl-2'),
    };
    const renderResult = testHook(useQueuePositions)('test-ns', statusMap);

    await renderResult.waitForNextUpdate();

    expect(getPendingWorkloadsMock).toHaveBeenCalledTimes(2);
    expect(getPendingWorkloadsMock).toHaveBeenCalledWith('test-ns', 'queue-a');
    expect(getPendingWorkloadsMock).toHaveBeenCalledWith('test-ns', 'queue-b');
    expect(renderResult).hookToStrictEqual({ nb1: 1, nb2: 1 });
  });

  it.each([
    [
      '403 errors (no RBAC)',
      Object.assign(new Error('Forbidden'), { statusObject: { code: 403 } }),
    ],
    ['non-403 errors', new Error('network error')],
  ])('should silently handle %s and return empty map', async (_, error) => {
    getPendingWorkloadsMock.mockRejectedValue(error);
    const statusMap = {
      nb1: makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-1'),
    };
    const renderResult = testHook(useQueuePositions)('test-ns', statusMap);
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({});
  });

  it('should omit position when workload is not found in pending list', async () => {
    getPendingWorkloadsMock.mockResolvedValue({
      items: [mockPendingWorkload('other-wl', 'test-ns', 0)],
    });

    const statusMap = {
      nb1: makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-not-found'),
    };
    const renderResult = testHook(useQueuePositions)('test-ns', statusMap);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({});
  });

  it('should not fetch for non-pending statuses', () => {
    const statusMap = {
      nb1: makeStatus(KueueWorkloadStatus.Running, 'user-queue', 'wl-1'),
      nb2: makeStatus(KueueWorkloadStatus.Admitted, 'user-queue', 'wl-2'),
      nb3: makeStatus(KueueWorkloadStatus.Failed, 'user-queue', 'wl-3'),
      nb4: makeStatus(KueueWorkloadStatus.Complete, 'user-queue', 'wl-4'),
    };
    testHook(useQueuePositions)('test-ns', statusMap);

    expect(getPendingWorkloadsMock).not.toHaveBeenCalled();
  });
});
