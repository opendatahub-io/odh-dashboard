import { act, renderHook, waitFor } from '@testing-library/react';
import * as k8sApi from '~/app/api/k8s';
import { useConnections } from '~/app/hooks/useConnections';
import { mockDchConnection, mockRhaiConnection } from '~/__mocks__/mockConnection';
import { ConnectionsResponse } from '~/app/types';

jest.mock('~/app/api/k8s');
const mockGetConnections = jest.fn();

describe('useConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(k8sApi.getConnections).mockReturnValue(mockGetConnections);
    mockGetConnections.mockResolvedValue({ data: [] });
  });

  it('should avoid fetching until a form opens with a project', async () => {
    const { result, rerender } = renderHook(
      ({ project, enabled }) => useConnections(project, enabled),
      {
        initialProps: { project: '', enabled: false },
      },
    );
    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(mockGetConnections).not.toHaveBeenCalled();
    rerender({ project: 'project-a', enabled: false });
    expect(mockGetConnections).not.toHaveBeenCalled();
    rerender({ project: 'project-a', enabled: true });
    await waitFor(() =>
      expect(mockGetConnections).toHaveBeenCalledWith(expect.anything(), 'project-a'),
    );
  });

  it('should return connections and partial-result warnings', async () => {
    const connection = mockDchConnection();
    const warnings = [
      { code: 'UNRESOLVED_CONNECTION_TYPE', message: 'Some connections could not be loaded.' },
    ];
    mockGetConnections.mockResolvedValue({ data: [connection], metadata: { warnings } });
    const { result } = renderHook(() => useConnections('project-a'));
    await waitFor(() => expect(result.current[0]).toEqual([connection]));
    expect(result.current[4]).toEqual(warnings);
  });

  it('should keep RHOAI display metadata out of selectable DCH connections', async () => {
    const dchConnection = mockDchConnection();
    const rhaiConnection = mockRhaiConnection();
    mockGetConnections.mockResolvedValue({
      data: [dchConnection],
      metadata: { rhaiConnections: [rhaiConnection] },
    });

    const { result } = renderHook(() => useConnections('project-a'));
    await waitFor(() => expect(result.current[5]).toEqual([dchConnection, rhaiConnection]));

    expect(result.current[0]).toEqual([dchConnection]);
    expect(result.current[5]).toEqual([dchConnection, rhaiConnection]);
  });

  it('should refetch on reopen and expose a refresh that returns fresh results', async () => {
    mockGetConnections.mockResolvedValue({ data: [mockDchConnection()] });
    const { result, rerender } = renderHook(({ enabled }) => useConnections('project-a', enabled), {
      initialProps: { enabled: true },
    });
    await waitFor(() => expect(result.current[1]).toBe(true));
    rerender({ enabled: false });
    await waitFor(() => expect(result.current[0]).toEqual([]));
    mockGetConnections.mockResolvedValue({ data: [mockDchConnection({ name: 'Renamed' })] });
    rerender({ enabled: true });
    await waitFor(() => expect(result.current[0][0]?.name).toBe('Renamed'));
    const refresh = result.current[3];
    await act(async () => {
      expect(await refresh()).toEqual([mockDchConnection({ name: 'Renamed' })]);
    });
    expect(result.current[3]).toBe(refresh);
    expect(mockGetConnections).toHaveBeenCalledTimes(3);
  });

  it('should reject a failed confirmation and hide stale results', async () => {
    mockGetConnections.mockResolvedValue({ data: [mockDchConnection()] });
    const { result } = renderHook(() => useConnections('project-a'));
    await waitFor(() => expect(result.current[1]).toBe(true));
    mockGetConnections.mockRejectedValue(new Error('Forbidden'));
    await act(async () => {
      await expect(result.current[3]()).rejects.toThrow('Unable to confirm');
    });
    expect(result.current[2]?.message).toBe('Forbidden');
    expect(result.current[0]).toEqual([]);
  });

  it('should discard a late response from a previously selected project', async () => {
    let resolveFirst: (value: ConnectionsResponse) => void = () => undefined;
    mockGetConnections.mockImplementationOnce(
      () =>
        new Promise<ConnectionsResponse>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { result, rerender } = renderHook(({ project }) => useConnections(project), {
      initialProps: { project: 'project-a' },
    });
    rerender({ project: 'project-b' });
    await waitFor(() => expect(result.current[1]).toBe(true));
    await act(async () => {
      resolveFirst({ data: [mockDchConnection()] });
    });
    expect(result.current[0]).toEqual([]);
  });
});
