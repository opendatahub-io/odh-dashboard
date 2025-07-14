import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { act } from 'react';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import { standardUseFetchState, testHook } from '#~/__tests__/unit/testUtils/hooks';
import useDistributedWorkloadsEnabled from '#~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled';
import { WorkloadKind } from '#~/k8sTypes';
import useWorkloads from '#~/concepts/distributedWorkloads/useWorkloads';

const mockedWorkloads = [
  mockWorkloadK8sResource({
    k8sName: 'test-workload',
    namespace: 'test-project',
  }),
];

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

jest.mock('#~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<WorkloadKind>);
const useDistributedWorkloadsEnabledMock = jest.mocked(useDistributedWorkloadsEnabled);

describe('useWorkloads', () => {
  it('should return workloads for a namespace', async () => {
    useDistributedWorkloadsEnabledMock.mockReturnValue(true);

    k8sListResourceItemsMock.mockResolvedValue(mockedWorkloads);

    const renderResult = testHook(useWorkloads)('test-project');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockedWorkloads, true));
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
    const renderResult = testHook(useWorkloads)();
    expect(k8sListResourceItemsMock).not.toHaveBeenCalled();
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(useWorkloads)('test-project');
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
