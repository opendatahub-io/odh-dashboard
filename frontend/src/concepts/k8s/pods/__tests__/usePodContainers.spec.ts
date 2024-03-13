import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockPipelinePodK8sResource } from '~/__mocks__/mockPipelinePodK8sResource';
import { PodKind } from '~/k8sTypes';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import usePodContainers from '~/concepts/k8s/pods/usePodContainers';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<PodKind>);

describe('usePodContainers', () => {
  it('should return and fetch pod containers', async () => {
    const pipelinePodMock = mockPipelinePodK8sResource({});
    k8sGetResourceMock.mockResolvedValue(pipelinePodMock);
    const renderResult = testHook(usePodContainers)('test-project', 'test-pod');
    expect(renderResult).hookToStrictEqual([]);
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(pipelinePodMock.spec.containers);
    expect(renderResult).hookToHaveUpdateCount(2);
  });
  it('should handle errors', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error'));

    const renderResult = testHook(usePodContainers)('test-project', 'test-pod');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual([]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
