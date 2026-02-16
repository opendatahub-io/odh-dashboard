import { testHook } from '@odh-dashboard/jest-config/hooks';
import useAssignedFlavor from '#~/utilities/useAssignedFlavor';
import { listWorkloads } from '#~/api';
import { getAssignedFlavorFromWorkload } from '#~/utilities/clusterQueueUtils';

const NAMESPACE = 'my-project';
const LOCAL_QUEUE_NAME = 'my-queue';
const WORKLOAD_NAME = 'my-notebook';
const CLUSTER_QUEUE_NAME = 'my-cluster-queue';

jest.mock('#~/api', () => ({
  listWorkloads: jest.fn(),
}));
jest.mock('#~/utilities/clusterQueueUtils', () => ({
  getAssignedFlavorFromWorkload: jest.fn(),
}));

const listWorkloadsMock = jest.mocked(listWorkloads);
const getAssignedFlavorFromWorkloadMock = jest.mocked(getAssignedFlavorFromWorkload);

const mockWorkloadWithFlavor = {
  apiVersion: 'kueue.x-k8s.io/v1beta1',
  kind: 'Workload',
  metadata: { name: WORKLOAD_NAME, namespace: NAMESPACE },
  spec: { queueName: LOCAL_QUEUE_NAME, podSets: [] },
  status: {
    admission: {
      clusterQueue: CLUSTER_QUEUE_NAME,
      podSetAssignments: [{ name: 'main', flavors: { cpu: 'large', memory: 'large' } }],
    },
  },
};

describe('useAssignedFlavor', () => {
  beforeEach(() => {
    listWorkloadsMock.mockReset();
    getAssignedFlavorFromWorkloadMock.mockReset();
  });

  it('returns undefined when namespace is undefined', () => {
    const renderResult = testHook(useAssignedFlavor)(undefined, 'my-queue', undefined);
    expect(renderResult.result.current).toBeUndefined();
    expect(listWorkloadsMock).not.toHaveBeenCalled();
  });

  it('returns undefined when localQueueName is undefined and no workloads match', async () => {
    listWorkloadsMock.mockResolvedValue([]);
    const renderResult = testHook(useAssignedFlavor)(NAMESPACE, undefined, undefined);
    await renderResult.waitForNextUpdate();
    expect(listWorkloadsMock).toHaveBeenCalledWith(NAMESPACE);
    expect(renderResult.result.current).toBeUndefined();
  });

  it('returns assigned flavor from matching workload when resourceName matches', async () => {
    listWorkloadsMock.mockResolvedValue([mockWorkloadWithFlavor as never]);
    getAssignedFlavorFromWorkloadMock.mockReturnValue('large');
    const renderResult = testHook(useAssignedFlavor)(NAMESPACE, LOCAL_QUEUE_NAME, WORKLOAD_NAME);
    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current).toBe('large');
    expect(getAssignedFlavorFromWorkloadMock).toHaveBeenCalledWith(mockWorkloadWithFlavor);
  });

  it('returns assigned flavor from first workload in queue when resourceName not provided', async () => {
    listWorkloadsMock.mockResolvedValue([mockWorkloadWithFlavor as never]);
    getAssignedFlavorFromWorkloadMock.mockReturnValue('large');
    const renderResult = testHook(useAssignedFlavor)(NAMESPACE, LOCAL_QUEUE_NAME);
    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current).toBe('large');
    expect(getAssignedFlavorFromWorkloadMock).toHaveBeenCalledWith(mockWorkloadWithFlavor);
  });
});
