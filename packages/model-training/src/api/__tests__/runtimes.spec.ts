import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ClusterTrainingRuntimeModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { getClusterTrainingRuntime } from '../runtimes';
import { mockClusterTrainingRuntimeK8sResource } from '../../__mocks__/mockClusterTrainingRuntimeK8sResource';

jest.mock('@openshift/dynamic-plugin-sdk-utils');

const mockK8sGetResource = jest.mocked(k8sGetResource);

describe('Runtimes API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClusterTrainingRuntime', () => {
    const mockRuntime = mockClusterTrainingRuntimeK8sResource({
      name: 'pytorch-runtime',
    });

    it('should fetch ClusterTrainingRuntime by name', async () => {
      mockK8sGetResource.mockResolvedValue(mockRuntime);

      const result = await getClusterTrainingRuntime('pytorch-runtime');

      expect(mockK8sGetResource).toHaveBeenCalledWith(
        expect.objectContaining({
          model: ClusterTrainingRuntimeModel,
          queryOptions: expect.objectContaining({
            name: 'pytorch-runtime',
          }),
        }),
      );
      expect(result).toEqual(mockRuntime);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Not found');
      mockK8sGetResource.mockRejectedValue(error);

      await expect(getClusterTrainingRuntime('pytorch-runtime')).rejects.toThrow('Not found');
    });

    it('should not include namespace in query options (cluster-scoped resource)', async () => {
      mockK8sGetResource.mockResolvedValue(mockRuntime);

      await getClusterTrainingRuntime('pytorch-runtime');

      expect(mockK8sGetResource).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.not.objectContaining({
            ns: expect.anything(),
          }),
        }),
      );
    });
  });
});
