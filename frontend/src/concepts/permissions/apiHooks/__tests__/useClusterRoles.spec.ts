import { renderHook } from '@testing-library/react';
import { listClusterRoles } from '#~/api';
import useFetch from '#~/utilities/useFetch';
import { useClusterRoles } from '#~/concepts/permissions/apiHooks/useClusterRoles';

jest.mock('#~/api', () => ({
  listClusterRoles: jest.fn(),
}));

jest.mock('#~/utilities/useFetch');

const mockUseFetch = jest.mocked(useFetch);
const mockListClusterRoles = jest.mocked(listClusterRoles);

describe('useClusterRoles', () => {
  const opts = { signal: new AbortController().signal };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('silences 403 errors by returning an empty list', async () => {
    mockUseFetch.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    mockListClusterRoles.mockRejectedValue({ statusObject: { code: 403 } });

    renderHook(() => useClusterRoles());
    const callback = mockUseFetch.mock.calls[0][0];

    await expect(callback(opts)).resolves.toEqual([]);
  });

  it('silences 403 errors when thrown error is an Error with statusObject.code', async () => {
    mockUseFetch.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const err = Object.assign(new Error('Forbidden'), { statusObject: { code: 403 } });
    mockListClusterRoles.mockRejectedValue(err);

    renderHook(() => useClusterRoles());
    const callback = mockUseFetch.mock.calls[0][0];

    await expect(callback(opts)).resolves.toEqual([]);
  });

  it('rethrows non-403 errors', async () => {
    mockUseFetch.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const err = new Error('boom');
    mockListClusterRoles.mockRejectedValue(err);

    renderHook(() => useClusterRoles());
    const callback = mockUseFetch.mock.calls[0][0];

    await expect(callback(opts)).rejects.toThrow('boom');
  });
});
