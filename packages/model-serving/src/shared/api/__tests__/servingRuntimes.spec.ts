import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockServingRuntimeK8sResource } from '../../../__mocks__/mockServingRuntimeK8sResource';
import { getServingRuntime } from '../servingRuntimes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));

const mockGetResource = jest.mocked(k8sGetResource);

describe('getServingRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the named runtime in the requested namespace', async () => {
    const runtime = mockServingRuntimeK8sResource({ name: 'my-runtime', namespace: 'my-project' });
    mockGetResource.mockResolvedValue(runtime);

    await expect(getServingRuntime('my-runtime', 'my-project')).resolves.toBe(runtime);

    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: {
        apiVersion: 'v1alpha1',
        apiGroup: 'serving.kserve.io',
        kind: 'ServingRuntime',
        plural: 'servingruntimes',
      },
      queryOptions: { name: 'my-runtime', ns: 'my-project', queryParams: {} },
      fetchOptions: { requestInit: {} },
    });
  });

  it.each([true, false])('should forward the abort signal and dryRun=%s', async (dryRun) => {
    const controller = new AbortController();
    const runtime = mockServingRuntimeK8sResource({});
    mockGetResource.mockResolvedValue(runtime);

    await expect(
      getServingRuntime('my-runtime', 'my-project', { signal: controller.signal, dryRun }),
    ).resolves.toBe(runtime);

    expect(mockGetResource).toHaveBeenCalledWith(
      expect.objectContaining({
        ...(dryRun && { payload: { dryRun: ['All'] } }),
        queryOptions: {
          name: 'my-runtime',
          ns: 'my-project',
          queryParams: dryRun ? { dryRun: 'All' } : {},
        },
        fetchOptions: { requestInit: { signal: controller.signal } },
      }),
    );
  });

  it.each(['Not found', 'Forbidden', 'Network failure'])(
    'should preserve %s errors',
    async (message) => {
      const error = new Error(message);
      mockGetResource.mockRejectedValue(error);

      await expect(getServingRuntime('my-runtime', 'my-project')).rejects.toBe(error);
      expect(mockGetResource).toHaveBeenCalledTimes(1);
    },
  );

  it('should preserve cancellation errors', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = new DOMException('The request was aborted', 'AbortError');
    mockGetResource.mockRejectedValue(error);

    await expect(
      getServingRuntime('my-runtime', 'my-project', { signal: controller.signal }),
    ).rejects.toBe(error);
  });
});
