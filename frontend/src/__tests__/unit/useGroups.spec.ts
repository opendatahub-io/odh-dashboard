import { act, renderHook, waitFor } from '@testing-library/react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import useGroups from '~/pages/projects/projectSharing/useGroups';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = k8sListResource as jest.Mock;

describe('useGroups', () => {
  it('should return successful list of groups', async () => {
    const mockList = {
      items: [{ metadata: { name: 'item 1' } }, { metadata: { name: 'item 2' } }],
    };

    k8sListResourceMock.mockReturnValue(Promise.resolve(mockList));
    const { result } = renderHook(() => useGroups());

    expect(result.current).toEqual([[], false, undefined, expect.any(Function)]);
    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(result.current).toEqual([mockList.items, true, undefined, expect.any(Function)]);

    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    // refresh
    await act(() => result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle 403 as an empty result', async () => {
    const error = {
      statusObject: {
        code: 403,
      },
    };

    k8sListResourceMock.mockReturnValue(Promise.reject(error));
    const { result } = renderHook(() => useGroups());

    expect(result.current).toEqual([[], false, undefined, expect.any(Function)]);
    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(result.current).toEqual([[], true, undefined, expect.any(Function)]);

    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    // refresh
    await act(() => result.current[3]());
    // error 403 should cache error and prevent subsequent attempts to fetch
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
  });

  it('should handle 404 as an error', async () => {
    const error = {
      statusObject: {
        code: 404,
      },
    };

    k8sListResourceMock.mockReturnValue(Promise.reject(error));
    const { result } = renderHook(() => useGroups());

    expect(result.current).toEqual([[], false, undefined, expect.any(Function)]);
    await waitFor(() => expect(result.current[2]).toBeTruthy());
    expect(result.current).toEqual([
      [],
      false,
      new Error('No groups found.'),
      expect.any(Function),
    ]);

    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    // refresh
    await act(() => result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });

  it('should handle other errors and rethrow', async () => {
    const error = new Error();

    k8sListResourceMock.mockReturnValue(Promise.reject(new Error()));
    const { result } = renderHook(() => useGroups());

    expect(result.current).toEqual([[], false, undefined, expect.any(Function)]);
    await waitFor(() => expect(result.current[2]).toBeTruthy());
    expect(result.current).toEqual([[], false, error, expect.any(Function)]);

    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    // refresh
    await act(() => result.current[3]());
    expect(k8sListResourceMock).toHaveBeenCalledTimes(2);
  });
});
