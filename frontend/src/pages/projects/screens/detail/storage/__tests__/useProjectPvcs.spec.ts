import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { act } from 'react';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import { PVCModel } from '~/api';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import useProjectPvcs from '~/pages/projects/screens/detail/storage/useProjectPvcs';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<PersistentVolumeClaimKind>);

describe('useProjectPVCs', () => {
  it('should return dashboard PVCs', async () => {
    const mockedPVC = [mockPVCK8sResource({})];
    const options = {
      model: PVCModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: { labelSelector: LABEL_SELECTOR_DASHBOARD_RESOURCE },
      },
    };

    k8sListResourceItemsMock.mockResolvedValue(mockedPVC);

    const renderResult = testHook(useProjectPvcs)('namespace');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith(options);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockedPVC, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceItemsMock.mockResolvedValue([]);
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle no namespace error', async () => {
    const renderResult = testHook(useProjectPvcs)();
    expect(k8sListResourceItemsMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(useProjectPvcs)('namespace');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    // refresh
    k8sListResourceItemsMock.mockRejectedValue(new Error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
