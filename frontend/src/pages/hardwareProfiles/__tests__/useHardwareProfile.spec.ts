import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { act } from 'react';
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { HardwareProfileModel } from '#~/api';
import { HardwareProfileKind } from '#~/k8sTypes';
import useHardwareProfile from '#~/pages/hardwareProfiles/useHardwareProfile';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource<HardwareProfileKind>);

describe('useHardwareProfile', () => {
  it('should return hardware profile', async () => {
    k8sGetResourceMock.mockResolvedValue(mockHardwareProfile({ uid: 'test-1' }));
    const options = {
      model: HardwareProfileModel,
      queryOptions: { name: 'migrated-gpu', ns: 'test' },
    };
    const renderResult = testHook(useHardwareProfile)('test', 'migrated-gpu');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith(options);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(mockHardwareProfile({ uid: 'test-1' }), true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sGetResourceMock.mockResolvedValue(mockHardwareProfile({}));
    await act(() => renderResult.result.current[3]());
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle no name error', async () => {
    const renderResult = testHook(useHardwareProfile)('test');
    expect(k8sGetResourceMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(useHardwareProfile)('namespace', 'test');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    // refresh
    k8sGetResourceMock.mockRejectedValue(new Error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
