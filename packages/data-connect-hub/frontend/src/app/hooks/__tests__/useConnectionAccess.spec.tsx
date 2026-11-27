import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { useConnectionAccess } from '~/app/hooks/useConnectionAccess';

const renderHookWithAccess = (
  checkAccess: HostApiCoreServices['checkAccess'],
  verb: 'create' | 'delete' | 'get',
  resource?: 'data-connections' | 'data-connection-types',
) =>
  renderHook(() => useConnectionAccess('test-project', verb, resource), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <HostApiCoreContext.Provider value={{ checkAccess } as HostApiCoreServices}>
        {children}
      </HostApiCoreContext.Provider>
    ),
  });

describe('useConnectionAccess', () => {
  it('checks create access for data connections in the namespace', async () => {
    const checkAccess = jest.fn(() => Promise.resolve(true));
    const { result } = renderHookWithAccess(checkAccess, 'create');

    await waitFor(() => expect(result.current).toEqual({ isAllowed: true, loaded: true }));
    expect(checkAccess).toHaveBeenCalledWith({
      group: 'dataconnecthub.opendatahub.io',
      resource: 'data-connections',
      verb: 'create',
      name: '',
      namespace: 'test-project',
      subresource: '',
    });
  });

  it('checks delete access for data connections in the namespace', async () => {
    const checkAccess = jest.fn(() => Promise.resolve(false));
    const { result } = renderHookWithAccess(checkAccess, 'delete');

    await waitFor(() => expect(result.current).toEqual({ isAllowed: false, loaded: true }));
    expect(checkAccess).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'data-connections', verb: 'delete' }),
    );
  });

  it('checks get access for data connection types in the namespace', async () => {
    const checkAccess = jest.fn(() => Promise.resolve(true));
    const { result } = renderHookWithAccess(checkAccess, 'get', 'data-connection-types');

    await waitFor(() => expect(result.current).toEqual({ isAllowed: true, loaded: true }));
    expect(checkAccess).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'data-connection-types', verb: 'get' }),
    );
  });

  it('returns denied access when the access review is denied', async () => {
    const checkAccess = jest.fn(() => Promise.resolve(false));
    const { result } = renderHookWithAccess(checkAccess, 'create');

    await waitFor(() => expect(result.current).toEqual({ isAllowed: false, loaded: true }));
  });
});
