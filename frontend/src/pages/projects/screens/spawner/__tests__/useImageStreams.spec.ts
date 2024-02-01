import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { act } from '@testing-library/react';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import useImageStreams from '~/pages/projects/screens/spawner/useImageStreams';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = k8sListResourceItems as jest.Mock;

describe('useImageStreams', () => {
  it('should return notebook image streams', async () => {
    const mockedImageStreams = { data: mockImageStreamK8sResource({}) };
    k8sListResourceItemsMock.mockReturnValue(Promise.resolve(mockedImageStreams));

    const renderResult = testHook(useImageStreams)('namespace');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockedImageStreams, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    k8sListResourceItemsMock.mockReturnValue(Promise.resolve({ data: mockedImageStreams.data }));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockReturnValue(Promise.reject(new Error('error1')));

    const renderResult = testHook(useImageStreams)('namespace');
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
    k8sListResourceItemsMock.mockReturnValue(Promise.reject(new Error('error2')));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
