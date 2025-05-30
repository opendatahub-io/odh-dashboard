import { act } from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { standardUseFetchState, testHook } from '#~/__tests__/unit/testUtils/hooks';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import useAcceleratorProfiles from '#~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { AcceleratorProfileKind } from '#~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<AcceleratorProfileKind>);

describe('useAcceleratorProfiles', () => {
  it('should return successful list of accelerators profiles', async () => {
    k8sListResourceMock.mockResolvedValue(
      mockK8sResourceList([mockAcceleratorProfile({ uid: 'test-project-12m' })]),
    );

    const renderResult = testHook(useAcceleratorProfiles)('test-project');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState([mockAcceleratorProfile({ uid: 'test-project-12m' })], true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockAcceleratorProfile({})]));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle other errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(useAcceleratorProfiles)('test-project');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    // refresh
    k8sListResourceMock.mockRejectedValue(new Error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
