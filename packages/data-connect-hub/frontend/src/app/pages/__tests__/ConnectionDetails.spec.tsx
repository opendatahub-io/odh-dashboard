import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { deleteConnection, verifyConnection } from '~/app/api/dch';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import ConnectionDetails from '~/app/pages/ConnectionDetails';
import { useConnection } from '~/app/hooks/useConnection';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import type { Connection } from '~/app/types';

jest.mock('~/app/hooks/useConnection');
jest.mock('~/app/hooks/useConnectionType');
jest.mock('~/app/hooks/useNamespaces');
jest.mock('~/app/api/dch', () => ({
  deleteConnection: jest.fn(),
  verifyConnection: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
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
const refresh = jest.fn();

const connection: Connection = {
  metadata: {
    id: 'connection-1',
    created_at: '2026-09-06T16:00:00Z',
    updated_at: '2026-09-07T16:00:00Z',
  },
  resource: {
    name: 'warehouse',
    data_connection_type_id: 'postgresql',
    format: 'tabular',
    properties: { region: 'us-east-1', bucket: 'warehouse-data' },
  },
  status: { state: 'ready', updated_at: '2026-09-08T16:00:00Z' },
};

const renderDetails = (
  entry = '/ai-hub/connections/connections/connection-1?project=test-project',
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

    expect(mockUseConnection).toHaveBeenCalledWith('test-project', 'connection-1');
    expect(screen.getAllByText('warehouse')).toHaveLength(3);
    expect(screen.getByTestId('connection-label').textContent).toBe('Connection');
    expect(
      screen.getByRole('link', { name: 'Connections - Test Project' }).getAttribute('href'),
    ).toBe('/ai-hub/connections/connections?project=test-project');
    expect(screen.getByTestId('connection-details').getAttribute('data-connection-id')).toBe(
      'connection-1',
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

    renderDetails('/connections/connection-1?project=test-project');

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

  it('verifies the connection and refreshes it', async () => {
    const user = userEvent.setup();
    const verifyRequest = jest.fn(() => Promise.resolve());
    mockVerifyConnection.mockImplementation(() => verifyRequest);
    mockUseConnection.mockReturnValue([connection, true, undefined, refresh]);

    renderDetails();
    await user.click(screen.getByTestId('connection-verify-button'));

    await waitFor(() => {
      expect(mockVerifyConnection).toHaveBeenCalledWith('');
      expect(verifyRequest).toHaveBeenCalledWith({}, 'test-project', 'connection-1');
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
      expect(verifyRequest).toHaveBeenCalledWith({}, 'test-project', 'connection-1');
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
    await user.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => {
      expect(deleteRequest).toHaveBeenCalledWith({}, 'test-project', 'connection-1');
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
      expect(verifyRequest).toHaveBeenCalledWith({}, 'test-project', 'connection-1');
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('connection-verify-button')).toHaveProperty('disabled', false);
  });

  it('renders the not-found state for an unknown connection', () => {
    mockUseConnection.mockReturnValue([undefined, true, undefined, refresh]);

    renderDetails('/ai-hub/connections/connections/missing?project=test-project');

    expect(screen.getByText('Connection not found')).toBeTruthy();
  });

  it('renders the load error state', () => {
    mockUseConnection.mockReturnValue([undefined, false, new Error('request failed'), refresh]);

    renderDetails();

    expect(screen.getByText('Unable to load connection')).toBeTruthy();
    expect(screen.getByText('request failed')).toBeTruthy();
  });

  it('redirects to connections when no project is selected', () => {
    renderDetails('/ai-hub/connections/connections/connection-1');

    expect(screen.getByTestId('connections-page')).toBeTruthy();
    expect(mockUseConnection).not.toHaveBeenCalled();
  });
});
