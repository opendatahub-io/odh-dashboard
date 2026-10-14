import { act, waitFor } from '@testing-library/react';
import * as k8sApi from '~/app/api/k8s';
import { useConnections } from '~/app/hooks/useConnections';
import { mockDchConnection, mockRhaiConnection } from '~/__mocks__/mockConnection';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
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
    const renderResult = renderHook(({ project, enabled }) => useConnections(project, enabled), {
      initialProps: { project: '', enabled: false },
    });
    const { result, rerender } = renderResult;
    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(mockGetConnections).not.toHaveBeenCalled();
    rerender({ project: 'project-a', enabled: false });
    expect(mockGetConnections).not.toHaveBeenCalled();
    rerender({ project: 'project-a', enabled: true });
    await waitFor(() =>
      expect(mockGetConnections).toHaveBeenCalledWith(expect.anything(), 'project-a'),
    );
    await waitFor(() => expect(result.current[1]).toBe(true));
    expect(renderResult).hookToHaveUpdateCount(6);
  });

  it('should return connections and partial-result warnings', async () => {
    const connection = mockDchConnection();
    const warnings = [
      { code: 'UNRESOLVED_CONNECTION_TYPE', message: 'Some connections could not be loaded.' },
    ];
    mockGetConnections.mockResolvedValue({ data: [connection], metadata: { warnings } });
    const renderResult = renderHook(() => useConnections('project-a'));
    const { result } = renderResult;
    await waitFor(() => expect(result.current[0]).toEqual([connection]));
    expect(result.current[4]).toEqual(warnings);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should keep RHOAI display metadata out of selectable DCH connections', async () => {
    const dchConnection = mockDchConnection();
    const rhaiConnection = mockRhaiConnection();
    mockGetConnections.mockResolvedValue({
      data: [dchConnection],
      metadata: { rhaiConnections: [rhaiConnection] },
    });

    const renderResult = renderHook(() => useConnections('project-a'));
    const { result } = renderResult;
    await waitFor(() => expect(result.current[5]).toEqual([dchConnection, rhaiConnection]));

    expect(result.current[0]).toEqual([dchConnection]);
    expect(result.current[5]).toEqual([dchConnection, rhaiConnection]);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should refetch on reopen and expose a refresh that returns fresh results', async () => {
    mockGetConnections.mockResolvedValue({ data: [mockDchConnection()] });
    const renderResult = renderHook(({ enabled }) => useConnections('project-a', enabled), {
      initialProps: { enabled: true },
    });
    const { result, rerender } = renderResult;
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
    expect(renderResult).hookToHaveUpdateCount(9);
  });

  it('should reject a failed confirmation and hide stale results', async () => {
    mockGetConnections.mockResolvedValue({ data: [mockDchConnection()] });
    const renderResult = renderHook(() => useConnections('project-a'));
    const { result } = renderResult;
    await waitFor(() => expect(result.current[1]).toBe(true));
    mockGetConnections.mockRejectedValue(new Error('Forbidden'));
    await act(async () => {
      await expect(result.current[3]()).rejects.toThrow('Unable to confirm');
    });
    expect(result.current[2]?.message).toBe('Forbidden');
    expect(result.current[0]).toEqual([]);
    expect(renderResult).hookToHaveUpdateCount(3);
  });

  it('should discard a late response from a previously selected project', async () => {
    let resolveFirst: (value: ConnectionsResponse) => void = () => undefined;
    mockGetConnections.mockImplementationOnce(
      () =>
        new Promise<ConnectionsResponse>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const renderResult = renderHook(({ project }) => useConnections(project), {
      initialProps: { project: 'project-a' },
    });
    const { result, rerender } = renderResult;
    rerender({ project: 'project-b' });
    await waitFor(() => expect(result.current[1]).toBe(true));
    await act(async () => {
      resolveFirst({ data: [mockDchConnection()] });
    });
    expect(result.current[0]).toEqual([]);
    expect(renderResult).hookToHaveUpdateCount(3);
  });
});
