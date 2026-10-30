import { k8sGetResource, type K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { fetchClusterDetails } from '../useClusterDetails';
import { ClusterVersionModel, InfrastructureModel } from '../models';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource);

describe('fetchClusterDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve cluster details', async () => {
    k8sGetResourceMock
      .mockResolvedValueOnce({
        apiVersion: 'config.openshift.io/v1',
        kind: 'ClusterVersion',
        status: { desired: { version: '4.18.3' } },
      } as K8sResourceCommon)
      .mockResolvedValueOnce({
        apiVersion: 'config.openshift.io/v1',
        kind: 'Infrastructure',
        status: {
          apiServerURL: 'https://api.example.test:6443',
          platformStatus: { type: 'AWS' },
        },
      } as K8sResourceCommon);

    await expect(fetchClusterDetails()).resolves.toEqual({
      apiServer: 'https://api.example.test:6443',
      infrastructureProvider: 'AWS',
      openshiftVersion: '4.18.3',
    });
    expect(k8sGetResourceMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        model: ClusterVersionModel,
        queryOptions: expect.objectContaining({ name: 'version' }),
      }),
    );
    expect(k8sGetResourceMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        model: InfrastructureModel,
        queryOptions: expect.objectContaining({ name: 'cluster' }),
      }),
    );
  });

  it('should use Unknown when cluster resources cannot be read', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('forbidden'));

    await expect(fetchClusterDetails()).resolves.toEqual({
      apiServer: 'Unknown',
      infrastructureProvider: 'Unknown',
      openshiftVersion: 'Unknown',
    });
  });
});
