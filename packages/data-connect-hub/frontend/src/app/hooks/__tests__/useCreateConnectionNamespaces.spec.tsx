import { renderHook, waitFor } from '@testing-library/react';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
import { useCreateConnectionNamespaces } from '~/app/hooks/useCreateConnectionNamespaces';
import { NamespaceKind } from '~/app/types';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  useHostApiCore: jest.fn(),
}));

const mockUseHostApiCore = jest.mocked(useHostApiCore);
const checkAccessMock = jest.fn();

describe('useCreateConnectionNamespaces', () => {
  const namespaces: NamespaceKind[] = [
    { name: 'writable-project', displayName: 'Writable Project' },
    { name: 'read-only-project', displayName: 'Read-only Project' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostApiCore.mockReturnValue({
      checkAccess: checkAccessMock,
    } as unknown as ReturnType<typeof useHostApiCore>);
  });

  it('returns only namespaces with connection creation prerequisites', async () => {
    checkAccessMock.mockImplementation(
      async ({ namespace, resource }: { namespace: string; resource: string }) =>
        namespace === 'writable-project' ||
        (namespace === 'read-only-project' && resource === 'data-connections'),
    );

    const { result } = renderHook(() => useCreateConnectionNamespaces(namespaces, true));

    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(result.current[0]).toEqual([
      { name: 'writable-project', displayName: 'Writable Project' },
    ]);
    expect(result.current[2]).toBeUndefined();
    expect(checkAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        group: 'dataconnecthub.opendatahub.io',
        resource: 'data-connections',
        verb: 'create',
        namespace: 'read-only-project',
      }),
    );
    expect(checkAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        group: 'dataconnecthub.opendatahub.io',
        resource: 'data-connection-types',
        verb: 'get',
        namespace: 'read-only-project',
      }),
    );
  });

  it('treats a failed access review as denied', async () => {
    checkAccessMock.mockRejectedValue(new Error('RBAC error'));

    const { result } = renderHook(() => useCreateConnectionNamespaces(namespaces, true));

    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(result.current[0]).toEqual([]);
    expect(result.current[2]).toBeUndefined();
  });

  it('does not check access when disabled', () => {
    const { result } = renderHook(() => useCreateConnectionNamespaces(namespaces, false));

    expect(result.current[0]).toEqual([]);
    expect(checkAccessMock).not.toHaveBeenCalled();
  });
});
