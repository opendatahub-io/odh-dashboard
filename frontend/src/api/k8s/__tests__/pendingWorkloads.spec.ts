import { commonFetchJSON, getK8sResourceURL } from '@openshift/dynamic-plugin-sdk-utils';
import { getPendingWorkloads } from '#~/api/k8s/pendingWorkloads';
import { VisibilityLocalQueueModel } from '#~/api/models/kueue';
import { PendingWorkloadsSummary } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  commonFetchJSON: jest.fn(),
  getK8sResourceURL: jest.fn(),
}));

const commonFetchJSONMock = jest.mocked(commonFetchJSON<PendingWorkloadsSummary>);
const getK8sResourceURLMock = jest.mocked(getK8sResourceURL);

describe('getPendingWorkloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getK8sResourceURLMock.mockReturnValue('/mock-url');
  });

  it('should build the correct URL and return the summary from commonFetchJSON', async () => {
    const mockSummary: PendingWorkloadsSummary = {
      items: [
        {
          metadata: { name: 'wl-1', namespace: 'test-ns' },
          priority: 100,
          localQueueName: 'user-queue',
          positionInClusterQueue: 0,
          positionInLocalQueue: 0,
        },
      ],
    };
    commonFetchJSONMock.mockResolvedValue(mockSummary);

    const result = await getPendingWorkloads('test-ns', 'user-queue');

    expect(getK8sResourceURLMock).toHaveBeenCalledWith(VisibilityLocalQueueModel, undefined, {
      name: 'user-queue',
      ns: 'test-ns',
      path: 'pendingworkloads',
    });
    expect(commonFetchJSONMock).toHaveBeenCalledWith('/mock-url');
    expect(result).toStrictEqual(mockSummary);
  });

  it('should propagate errors from commonFetchJSON', async () => {
    commonFetchJSONMock.mockRejectedValue(new Error('network error'));

    await expect(getPendingWorkloads('test-ns', 'user-queue')).rejects.toThrow('network error');
  });
});
