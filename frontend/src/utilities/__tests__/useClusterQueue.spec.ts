import { testHook } from '@odh-dashboard/jest-config/hooks';
import { ClusterQueueKind } from '#~/k8sTypes';
import useClusterQueue from '#~/utilities/useClusterQueue';
import { getClusterQueue } from '#~/api';

jest.mock('#~/api', () => ({
  getClusterQueue: jest.fn(),
}));

const getClusterQueueMock = jest.mocked(getClusterQueue);

const mockClusterQueue: ClusterQueueKind = {
  apiVersion: 'kueue.x-k8s.io/v1beta1',
  kind: 'ClusterQueue',
  metadata: { name: 'default-cq' },
  spec: {
    resourceGroups: [
      {
        coveredResources: ['cpu', 'memory'],
        flavors: [
          {
            name: 'default-flavor',
            resources: [
              { name: 'cpu', nominalQuota: 100 },
              { name: 'memory', nominalQuota: '200Gi' },
            ],
          },
        ],
      },
    ],
  },
  status: {
    flavorsUsage: [
      {
        name: 'default-flavor',
        resources: [
          { name: 'cpu', total: '9700m' },
          { name: 'memory', total: '18880Mi' },
        ],
      },
    ],
  },
} as ClusterQueueKind;

describe('useClusterQueue', () => {
  beforeEach(() => {
    getClusterQueueMock.mockReset();
  });

  it('does not call getClusterQueue and returns clusterQueue null when clusterQueueName is null', () => {
    const renderResult = testHook(useClusterQueue)(null);

    expect(renderResult.result.current).toMatchObject({
      clusterQueue: null,
      loaded: false,
    });
    expect(getClusterQueueMock).not.toHaveBeenCalled();
  });

  it('does not call getClusterQueue when clusterQueueName is undefined', () => {
    const renderResult = testHook(useClusterQueue)(undefined);

    expect(renderResult.result.current.clusterQueue).toBeNull();
    expect(renderResult.result.current.loaded).toBe(false);
    expect(getClusterQueueMock).not.toHaveBeenCalled();
  });

  it('calls getClusterQueue with name and returns clusterQueue when resolved', async () => {
    getClusterQueueMock.mockResolvedValue(mockClusterQueue);

    const renderResult = testHook(useClusterQueue)('default-cq');

    expect(renderResult.result.current).toMatchObject({
      clusterQueue: null,
      loaded: false,
    });
    expect(getClusterQueueMock).toHaveBeenCalledWith('default-cq');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toMatchObject({
      clusterQueue: mockClusterQueue,
      loaded: true,
      error: undefined,
    });
  });

  it('returns error when getClusterQueue rejects', async () => {
    const fetchError = new Error('ClusterQueue not found');
    getClusterQueueMock.mockRejectedValue(fetchError);

    const renderResult = testHook(useClusterQueue)('missing-cq');

    expect(getClusterQueueMock).toHaveBeenCalledWith('missing-cq');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toMatchObject({
      clusterQueue: null,
      loaded: false,
      error: fetchError,
    });
  });

  it('returns clusterQueue as null (not undefined) when loaded', async () => {
    getClusterQueueMock.mockResolvedValue(mockClusterQueue);

    const renderResult = testHook(useClusterQueue)('default-cq');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.clusterQueue).not.toBeUndefined();
    expect(renderResult.result.current.clusterQueue).toBe(mockClusterQueue);
  });

  it('returns only documented shape: clusterQueue, loaded, error', () => {
    const renderResult = testHook(useClusterQueue)(null);
    const keys = Object.keys(renderResult.result.current).toSorted();

    expect(keys).toEqual(['clusterQueue', 'error', 'loaded']);
  });
});
