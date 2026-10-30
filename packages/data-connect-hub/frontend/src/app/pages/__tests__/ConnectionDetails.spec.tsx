import React from 'react';
import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { deleteConnection, verifyConnection } from '~/app/api/dch';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import ConnectionDetails from '~/app/pages/ConnectionDetails';
import { useConnection } from '~/app/hooks/useConnection';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import * as trackingUtilities from '~/app/utilities/tracking';
import type { Connection } from '~/app/types';

jest.mock('~/app/hooks/useConnection');
jest.mock('~/app/hooks/useConnectionType');
jest.mock('~/app/hooks/useNamespaces');
jest.mock('~/app/utilities/tracking', () => ({
  DATA_CONNECT_HUB_EVENT_NAMES: {
    deleteInitiated: 'Connections Connection Delete Initiated',
  },
  getConnectionTypeProvider: (connectionType?: { resource: { provider: string } }) =>
    connectionType?.resource.provider,
  fireDataConnectHubTrackEvent: jest.fn(),
}));
jest.mock('~/app/api/dch', () => ({
  deleteConnection: jest.fn(),
  verifyConnection: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual<typeof import('@odh-dashboard/ui-core')>('@odh-dashboard/ui-core'),
  DeleteModal: ({
    deleteName,
    error,
    onClose,
    onDelete,
  }: {
    deleteName: string;
    error?: Error;
    onClose: () => void;
    onDelete: () => void;
  }) => (
    <div data-testid="delete-modal">
      <span>{deleteName}</span>
      {error && <span>{error.message}</span>}
      <button type="button" data-testid="delete-confirm" onClick={onDelete}>
        Confirm delete
      </button>
      <button type="button" data-testid="delete-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const mockUseConnection = jest.mocked(useConnection);
const mockUseConnectionType = jest.mocked(useConnectionType);
const mockUseNamespaces = jest.mocked(useNamespaces);
const mockVerifyConnection = jest.mocked(verifyConnection);
const mockDeleteConnection = jest.mocked(deleteConnection);
const mockTrackEvent = jest.mocked(trackingUtilities.fireDataConnectHubTrackEvent);
const refresh = jest.fn(() => Promise.resolve(undefined));

const connection: Connection = {
  metadata: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    created_at: '2026-09-06T16:00:00Z',
    updated_at: '2026-09-07T16:00:00Z',
  },
  resource: {
    name: 'warehouse',
    data_connection_type_id: '550e8400-e29b-41d4-a716-446655440003',
    format: 'tabular',
    credentials_ref: { secret: 'warehouse' },
    properties: { region: 'us-east-1', bucket: 'warehouse-data' },
  },
  status: { state: 'ready', updated_at: '2026-09-08T16:00:00Z' },
};

const otherConnection: Connection = {
  ...connection,
  metadata: {
    ...connection.metadata,
    id: '550e8400-e29b-41d4-a716-446655440002',
  },
  resource: {
    ...connection.resource,
    name: 'object-store',
    credentials_ref: { secret: 'object-store' },
  },
};

const renderDetails = (
  entry = '/ai-hub/connections/connections/550e8400-e29b-41d4-a716-446655440001?project=test-project',
) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/connections" element={<div data-testid="connections-page" />} />
        <Route path="/connections/:connectionId" element={<ConnectionDetails />} />
        <Route
          path="/ai-hub/connections/connections"
          element={<div data-testid="connections-page" />}
        />
        <Route
          path="/ai-hub/connections/connections/:connectionId"
          element={<ConnectionDetails />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderNavigableDetails = (entry: string) => {
  let navigate: (path: string) => void = () => undefined;
  const NavigationProbe = () => {
    navigate = useNavigate();
    return null;
  };

  render(
    <MemoryRouter initialEntries={[entry]}>
      <NavigationProbe />
      <Routes>
        <Route path="/connections" element={<div data-testid="connections-page" />} />
        <Route path="/connections/:connectionId" element={<ConnectionDetails />} />
        <Route
          path="/ai-hub/connections/connections"
          element={<div data-testid="connections-page" />}
        />
        <Route
          path="/ai-hub/connections/connections/:connectionId"
          element={<ConnectionDetails />}
        />
      </Routes>
    </MemoryRouter>,
  );

  return (path: string) => navigate(path);
};

describe('ConnectionDetails', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNamespaces.mockReturnValue([
      [{ name: 'test-project', displayName: 'Test Project' }],
      true,
      undefined,
    ]);
    mockUseConnectionType.mockReturnValue([mockConnectionType(), true, undefined]);
  });

  it('renders the connection header and breadcrumb', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-10T16:00:00Z').getTime());
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails();

    expect(mockUseConnection).toHaveBeenCalledWith(
      'test-project',
      '550e8400-e29b-41d4-a716-446655440001',
    );
    expect(screen.getAllByText('warehouse')).toHaveLength(3);
    expect(screen.getByTestId('connection-label').textContent).toBe('Connection');
    expect(
      screen.getByRole('link', { name: 'Connections - Test Project' }).getAttribute('href'),
    ).toBe('/ai-hub/connections/connections?project=test-project');
    expect(screen.getByTestId('connection-details').getAttribute('data-connection-id')).toBe(
      '550e8400-e29b-41d4-a716-446655440001',
    );
    expect(screen.getByTestId('connection-details-card').textContent).toContain(
      'Connection details',
    );
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Created')).toBeTruthy();
    expect(screen.getByText('4 days ago')).toBeTruthy();
    expect(screen.getByText('Last modified')).toBeTruthy();
    expect(screen.getByText('3 days ago')).toBeTruthy();
    expect(screen.getByText('Properties')).toBeTruthy();
    expect(screen.getByText('region')).toBeTruthy();
    expect(screen.getByText('us-east-1')).toBeTruthy();
    expect(screen.getByText('bucket')).toBeTruthy();
    expect(screen.getByText('warehouse-data')).toBeTruthy();
  });

  it('uses path-relative navigation in standalone mode', () => {
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails('/connections/550e8400-e29b-41d4-a716-446655440001?project=test-project');

    expect(
      screen.getByRole('link', { name: 'Connections - Test Project' }).getAttribute('href'),
    ).toBe('/connections?project=test-project');
  });

  it('renders the verification status card', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-10T16:00:00Z').getTime());
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails();

    expect(screen.getByText('Verification status')).toBeTruthy();
    expect(screen.getByTestId('connection-status-label').textContent).toBe('Verified');
    expect(screen.getByTestId('connection-last-tested').textContent).toBe('2 days ago');
    expect(screen.getByRole('button', { name: 'Verify connection' })).toBeTruthy();
  });

  it('renders unverified when the last-tested timestamp is absent', () => {
    mockUseConnection.mockReturnValue([
      { ...connection, status: { state: 'ready' } },
      true,
      undefined,
      refresh,
    ]);

    renderDetails();

    expect(screen.getByTestId('connection-status-label').textContent).toBe('Unverified');
    expect(screen.getByTestId('connection-last-tested').textContent).toBe('-');
  });

  it('renders a newly created connection as unverified', () => {
    mockUseConnection.mockReturnValue([
      {
        ...connection,
        status: {
          state: 'not_ready',
          updated_at: connection.metadata.created_at,
        },
      },
      true,
      undefined,
      refresh,
    ]);

    renderDetails();

    expect(screen.getByTestId('connection-status-label').textContent).toBe('Unverified');
    expect(screen.getByTestId('connection-last-tested').textContent).toBe('-');
  });

  it('verifies the connection and refreshes it', async () => {
    const user = userEvent.setup();
    const verifyRequest = jest.fn(() => Promise.resolve());
    mockVerifyConnection.mockImplementation(() => verifyRequest);
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails();
    await user.click(screen.getByTestId('connection-verify-button'));

    await waitFor(() => {
      expect(mockVerifyConnection).toHaveBeenCalledWith('');
      expect(verifyRequest).toHaveBeenCalledWith(
        {},
        'test-project',
        '550e8400-e29b-41d4-a716-446655440001',
      );
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('verifies the connection from the header actions menu', async () => {
    const user = userEvent.setup();
    const verifyRequest = jest.fn(() => Promise.resolve());
    mockVerifyConnection.mockImplementation(() => verifyRequest);
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails();
    await user.click(screen.getByTestId('connection-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Verify connection' }));

    await waitFor(() => {
      expect(verifyRequest).toHaveBeenCalledWith(
        {},
        'test-project',
        '550e8400-e29b-41d4-a716-446655440001',
      );
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('deletes the connection from the header actions menu', async () => {
    const user = userEvent.setup();
    const deleteRequest = jest.fn(() => Promise.resolve());
    mockDeleteConnection.mockImplementation(() => deleteRequest);
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails();
    await user.click(screen.getByTestId('connection-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Connections Connection Delete Initiated',
      properties: { project: 'test-project', connectionTypeProvider: 'postgresql' },
    });
    await user.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => {
      expect(deleteRequest).toHaveBeenCalledWith(
        {},
        'test-project',
        '550e8400-e29b-41d4-a716-446655440001',
      );
      expect(screen.getByTestId('connections-page')).toBeTruthy();
    });
  });

  it('shows an error when verification fails', async () => {
    const user = userEvent.setup();
    const verifyRequest = jest.fn(() => Promise.reject(new Error('verification failed')));
    mockVerifyConnection.mockImplementation(() => verifyRequest);
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails();
    await user.click(screen.getByTestId('connection-verify-button'));

    await waitFor(() => {
      expect(screen.getByText('verification failed')).toBeTruthy();
      expect(verifyRequest).toHaveBeenCalledWith(
        {},
        'test-project',
        '550e8400-e29b-41d4-a716-446655440001',
      );
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('connection-verify-button')).toHaveProperty('disabled', false);
  });

  it('resets pending verification state when the connection ID changes', async () => {
    const user = userEvent.setup();
    let rejectVerification: (error: Error) => void = () => undefined;
    const pendingVerification = new Promise<void>((_resolve, reject) => {
      rejectVerification = reject;
    });
    pendingVerification.catch(() => undefined);
    mockVerifyConnection.mockImplementation(
      () => (_options, _namespace, _connectionId) => pendingVerification,
    );
    mockUseConnection.mockImplementation((_namespace, connectionId) => [
      connectionId === otherConnection.metadata.id ? otherConnection : connection,
      true,
      undefined,
      refresh,
    ]);

    const navigate = renderNavigableDetails(
      '/ai-hub/connections/connections/550e8400-e29b-41d4-a716-446655440001?project=test-project',
    );
    await user.click(screen.getByTestId('connection-verify-button'));
    expect(screen.getByTestId('connection-verify-button')).toHaveProperty('disabled', true);

    navigate(
      '/ai-hub/connections/connections/550e8400-e29b-41d4-a716-446655440002?project=test-project',
    );

    await waitFor(() => {
      expect(screen.getAllByText('object-store').length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId('connection-verify-button')).toHaveProperty('disabled', false);
    expect(screen.queryByText('Verifying')).toBeNull();

    rejectVerification(new Error('stale verification failed'));
    await waitFor(() => {
      expect(screen.queryByText('stale verification failed')).toBeNull();
    });
  });

  it('does not refresh a connection after the details page unmounts', async () => {
    const user = userEvent.setup();
    let resolveVerification: () => void = () => undefined;
    const pendingVerification = new Promise<void>((resolve) => {
      resolveVerification = resolve;
    });
    mockVerifyConnection.mockImplementation(
      () => (_options, _namespace, _connectionId) => pendingVerification,
    );
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    const { unmount } = renderDetails();
    await user.click(screen.getByTestId('connection-verify-button'));
    unmount();

    resolveVerification();
    await Promise.resolve();

    expect(refresh).not.toHaveBeenCalled();
  });

  it('renders the not-found state for an unknown connection', () => {
    mockUseConnection.mockReturnValue([null, true, undefined, refresh]);

    renderDetails(
      '/ai-hub/connections/connections/550e8400-e29b-41d4-a716-446655440009?project=test-project',
    );

    expect(screen.getByText('Connection not found')).toBeTruthy();
  });

  it('renders the not-found state when loading a connection returns HTTP 404', async () => {
    const fetchMock = jest
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue({
        status: 404,
        ok: false,
        text: () =>
          Promise.resolve(
            '{"error":{"code":"404","message":"the requested resource could not be found"}}',
          ),
      } as Response);
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    jest.isolateModules(() => {
      jest.doMock('react', () => React);
      jest.doMock('react-router-dom', () => ReactRouterDom);
      jest.doMock('~/app/hooks/useConnection', () =>
        jest.requireActual('~/app/hooks/useConnection'),
      );
      jest.doMock('~/app/api/dch', () => ({
        ...jest.requireActual<typeof import('~/app/api/dch')>('~/app/api/dch'),
        deleteConnection: jest.fn(),
        verifyConnection: jest.fn(),
      }));
      jest.doMock('~/app/hooks/useNamespaces', () => ({
        useNamespaces: () => [[{ name: 'test-project', displayName: 'Test Project' }]],
      }));

      const ActualConnectionDetails = jest.requireActual<{
        default: React.ComponentType;
      }>('~/app/pages/ConnectionDetails').default;
      render(
        <MemoryRouter
          initialEntries={[
            '/ai-hub/connections/connections/550e8400-e29b-41d4-a716-446655440009?project=test-project',
          ]}
        >
          <Routes>
            <Route
              path="/ai-hub/connections/connections/:connectionId"
              element={<ActualConnectionDetails />}
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Connection not found')).toBeTruthy();
    });
    expect(screen.queryByText('Unable to load connection')).toBeNull();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('keeps verification pending until the refreshed connection arrives', async () => {
    const user = userEvent.setup();
    let connectionRequests = 0;
    let readinessRequestStarted = false;
    const fetchMock = jest
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockImplementation((input, init) => {
        if (init?.method === 'POST') {
          readinessRequestStarted = true;
          return Promise.resolve({
            status: 204,
            ok: true,
            text: () => Promise.resolve(''),
          } as Response);
        }

        connectionRequests += 1;
        if (connectionRequests === 1) {
          return Promise.resolve({
            status: 200,
            ok: true,
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  data: {
                    ...connection,
                    resource: {
                      ...connection.resource,
                      credentials_ref: { secret: connection.resource.credentials_ref.secret },
                    },
                  },
                }),
              ),
          } as Response);
        }
        return new Promise<Response>(() => undefined);
      });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    jest.resetModules();
    jest.doMock('react', () => React);
    jest.doMock('react-router-dom', () => ReactRouterDom);
    jest.doMock('~/app/hooks/useConnection', () => jest.requireActual('~/app/hooks/useConnection'));
    jest.doMock('~/app/hooks/useConnectionType', () => ({
      useConnectionType: () => [mockConnectionType(), true, undefined],
    }));
    jest.doMock('~/app/api/dch', () => ({
      ...jest.requireActual<typeof import('~/app/api/dch')>('~/app/api/dch'),
      deleteConnection: jest.fn(),
    }));
    jest.doMock('~/app/hooks/useNamespaces', () => ({
      useNamespaces: () => [[{ name: 'test-project', displayName: 'Test Project' }]],
    }));

    const ActualConnectionDetails = require('~/app/pages/ConnectionDetails')
      .default as React.ComponentType;
    const renderResult = render(
      <MemoryRouter
        initialEntries={[
          '/ai-hub/connections/connections/550e8400-e29b-41d4-a716-446655440001?project=test-project',
        ]}
      >
        <Routes>
          <Route
            path="/ai-hub/connections/connections/:connectionId"
            element={<ActualConnectionDetails />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByTestId('connection-verify-button'));
    await waitFor(() => {
      expect(connectionRequests).toBe(2);
    });
    expect(readinessRequestStarted).toBe(true);
    await Promise.resolve();

    expect(screen.getByTestId('connection-verify-button')).toHaveProperty('disabled', true);
    expect(connectionRequests).toBe(2);

    renderResult?.unmount();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('renders the load error state', () => {
    mockUseConnection.mockReturnValue([null, false, new Error('request failed'), refresh]);

    renderDetails();

    expect(screen.getByText('Unable to load connection')).toBeTruthy();
    expect(screen.getByText('request failed')).toBeTruthy();
  });

  it('redirects to connections when no project is selected', () => {
    renderDetails('/ai-hub/connections/connections/550e8400-e29b-41d4-a716-446655440001');

    expect(screen.getByTestId('connections-page')).toBeTruthy();
    expect(mockUseConnection).not.toHaveBeenCalled();
  });
});
