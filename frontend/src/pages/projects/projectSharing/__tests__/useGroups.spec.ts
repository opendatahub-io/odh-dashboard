import { act } from '@testing-library/react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import useGroups from '~/pages/projects/projectSharing/useGroups';
import { GroupKind } from '~/k8sTypes';
import { expectHook, standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = k8sListResource as jest.Mock;

describe('useGroups', () => {
  it('should return successful list of groups', async () => {
    const mockList = {
      items: [{ metadata: { name: 'item 1' } }, { metadata: { name: 'item 2' } }] as GroupKind[],
    };
    k8sListResourceMock.mockReturnValue(Promise.resolve(mockList));

    const renderResult = testHook(useGroups);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult).toStrictEqual(standardUseFetchState([])).toHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState(mockList.items, true))
      .toHaveUpdateCount(2)
      .toBeStable([false, false, true, true]);

    // refresh
    k8sListResourceMock.mockReturnValue(Promise.resolve({ items: [...mockList.items] }));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expectHook(renderResult).toHaveUpdateCount(3).toBeStable([false, true, true, true]);
  });

  it('should handle 403 as an empty result', async () => {
    const error = {
      statusObject: {
        code: 403,
      },
    };
    k8sListResourceMock.mockReturnValue(Promise.reject(error));

    const renderResult = testHook(useGroups);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult).toStrictEqual(standardUseFetchState([])).toHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([], true))
      .toHaveUpdateCount(2)
      .toBeStable([false, false, true, true]);

    // refresh
    await act(() => renderResult.result.current[3]());
    // error 403 should cache error and prevent subsequent attempts to fetch
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([], true))
      .toHaveUpdateCount(3)
      .toBeStable([false, true, true, true]);
  });

  it('should handle 404 as an error', async () => {
    const error = {
      statusObject: {
        code: 404,
      },
    };
    k8sListResourceMock.mockReturnValue(Promise.reject(error));

    const renderResult = testHook(useGroups);

    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult).toStrictEqual(standardUseFetchState([])).toHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([], false, new Error('No groups found.')))
      .toHaveUpdateCount(2)
      .toBeStable([true, true, false, true]);

    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);

    // refresh
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    // we get a new error because the k8s API is called a 2nd time
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([], false, new Error('No groups found.')))
      .toHaveUpdateCount(3)
      .toBeStable([true, true, false, true]);
  });

  it('should handle other errors and rethrow', async () => {
    k8sListResourceMock.mockReturnValue(Promise.reject(new Error('error1')));

    const renderResult = testHook(useGroups);
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult).toStrictEqual(standardUseFetchState([])).toHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([], false, new Error('error1')))
      .toHaveUpdateCount(2)
      .toBeStable([true, true, false, true]);

    // refresh
    k8sListResourceMock.mockReturnValue(Promise.reject(new Error('error2')));
    await act(() => renderResult.result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
    expectHook(renderResult)
      .toStrictEqual(standardUseFetchState([], false, new Error('error2')))
      .toHaveUpdateCount(3)
      .toBeStable([true, true, false, true]);
  });
});
