import { testHook } from '@odh-dashboard/jest-config/hooks';
import {
  KueueWorkloadStatus,
  type KueueWorkloadStatusWithMessage,
} from '@odh-dashboard/k8s-core/kueue/types';
import { getPendingWorkloads } from '#~/api/k8s/pendingWorkloads';
import { useQueuePositionsForDeployments } from '#~/pages/modelServing/useQueuePositionsForDeployments';
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

describe('useQueuePositionsForDeployments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[string, string | undefined, Record<string, KueueWorkloadStatusWithMessage | null>]>([
    [
      'namespace is undefined',
      undefined,
      { 'InferenceService/my-model': makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-1') },
    ],
    [
      'status is not pending',
      'test-ns',
      {
        'InferenceService/my-model': makeStatus(KueueWorkloadStatus.Running, 'user-queue', 'wl-1'),
        'InferenceService/other': null,
      },
    ],
    [
      'queueName is missing',
      'test-ns',
      { 'InferenceService/my-model': makeStatus(KueueWorkloadStatus.Queued, undefined, 'wl-1') },
    ],
    [
      'workloadName is missing',
      'test-ns',
      {
        'InferenceService/my-model': makeStatus(
          KueueWorkloadStatus.Queued,
          'user-queue',
          undefined,
        ),
      },
    ],
  ])('should return empty map and not fetch when %s', (_, ns, statusMap) => {
    const renderResult = testHook(useQueuePositionsForDeployments)(ns, statusMap);
    expect(renderResult).hookToStrictEqual({});
    expect(getPendingWorkloadsMock).not.toHaveBeenCalled();
  });

  it('should fetch positions for Queued workloads', async () => {
    getPendingWorkloadsMock.mockResolvedValue({
      items: [mockPendingWorkload('wl-1', 'test-ns', 0)],
    });

    const statusMap = {
      'InferenceService/my-model': makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-1'),
    };
    const renderResult = testHook(useQueuePositionsForDeployments)('test-ns', statusMap);

    await renderResult.waitForNextUpdate();

    expect(getPendingWorkloadsMock).toHaveBeenCalledWith('test-ns', 'user-queue');
    expect(renderResult).hookToStrictEqual({
      'InferenceService/my-model': { queuePosition: 1, queueTotal: 1 },
    });
  });

  it('should skip malformed Visibility API responses without failing other queues', async () => {
    getPendingWorkloadsMock.mockImplementation(async (_ns, queueName) => {
      if (queueName === 'bad-queue') {
        return { items: undefined } as unknown as { items: PendingWorkload[] };
      }
      return { items: [mockPendingWorkload('wl-2', 'test-ns', 1)] };
    });

    const statusMap = {
      'InferenceService/bad': makeStatus(KueueWorkloadStatus.Queued, 'bad-queue', 'wl-1'),
      'InferenceService/good': makeStatus(KueueWorkloadStatus.Queued, 'good-queue', 'wl-2'),
    };
    const renderResult = testHook(useQueuePositionsForDeployments)('test-ns', statusMap);
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({
      'InferenceService/good': { queuePosition: 2, queueTotal: 1 },
    });
  });

  it('should silently handle 403 and return empty map', async () => {
    getPendingWorkloadsMock.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { statusObject: { code: 403 } }),
    );
    const statusMap = {
      'InferenceService/my-model': makeStatus(KueueWorkloadStatus.Queued, 'user-queue', 'wl-1'),
    };
    const renderResult = testHook(useQueuePositionsForDeployments)('test-ns', statusMap);
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({});
  });
});
