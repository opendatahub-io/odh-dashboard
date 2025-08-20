import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { act } from 'react';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { PodKind } from '#~/k8sTypes';
import usePod from '#~/concepts/k8s/pods/usePod';
import { mockPipelinePodK8sResource } from '#~/__mocks__/mockPipelinePodK8sResource';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<PodKind>);

describe('usePod', () => {
  it('should return pod', async () => {
    const mockPod = mockPipelinePodK8sResource({});
    k8sGetResourceMock.mockResolvedValue(mockPod);
    const renderResult = testHook(usePod)('test-project', 'test-pod');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockPod, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sGetResourceMock.mockResolvedValue(mockPod);
    await act(() => renderResult.result.current[3]());
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });
  it('should handle errors', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('No pod name'));

    const renderResult = testHook(usePod)('test-project', '');
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false));
  });
});
