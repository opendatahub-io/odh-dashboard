import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ConnectionsTab, { synchronizeTypeSelection } from '~/app/pages/ConnectionsTab';
import * as trackingUtilities from '~/app/utilities/tracking';
import { useConnections } from '~/app/hooks/useConnections';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import { deleteConnection, verifyConnection } from '~/app/api/dch';

jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('~/app/hooks/useNamespaces');
jest.mock('~/app/utilities/tracking', () => ({
  DATA_CONNECT_HUB_EVENT_NAMES: {
    addStarted: 'Connections Add Started',
    typeSelected: 'Connections Type Selected',
    connectionCreated: 'Connections Connection Created',
    createCanceled: 'Connections Create Canceled',
    deleteInitiated: 'Connections Connection Delete Initiated',
    listFilterApplied: 'Connections List Filter Applied',
  },
  getConnectionTypeProvider: (connectionType?: { resource: { provider: string } }) =>
    connectionType?.resource.provider,
  fireDataConnectHubTrackEvent: jest.fn(),
}));
const mockNotificationSuccess = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: mockNotificationSuccess, error: jest.fn() }),
}));
jest.mock('~/app/api/dch', () => ({
  createConnection: jest.fn(),
  deleteConnection: jest.fn(),
  verifyConnection: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core', () => ({
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

const mockUseConnections = jest.mocked(useConnections);
const mockUseConnectionTypes = jest.mocked(useConnectionTypes);
const mockUseNamespaces = jest.mocked(useNamespaces);
const mockVerifyConnection = jest.mocked(verifyConnection);
const mockDeleteConnection = jest.mocked(deleteConnection);
const mockTrackEvent = jest.fn();

const renderConnectionsTab = (props: React.ComponentProps<typeof ConnectionsTab>) =>
  render(
    <MemoryRouter>
      <ConnectionsTab {...props} />
    </MemoryRouter>,
  );

const connections = [
  {
    metadata: { id: '550e8400-e29b-41d4-a716-446655440001' },
    resource: {
      name: 'warehouse',
      data_connection_type_id: '550e8400-e29b-41d4-a716-446655440003',
      format: 'tabular' as const,
      credentials_ref: { secret: 'warehouse' },
    },
    status: { state: 'ready' as const, updated_at: '2026-09-08T16:00:00Z' },
  },
  {
    metadata: { id: '550e8400-e29b-41d4-a716-446655440002' },
    resource: {
      name: 'object-store',
      data_connection_type_id: '550e8400-e29b-41d4-a716-446655440004',
      format: 'binary' as const,
      credentials_ref: { secret: 'object-store' },
    },
    status: { state: 'not_ready' as const },
  },
];

const connectionTypes = [
  {
    metadata: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-08T16:00:00Z',
    },
    resource: {
      name: 'PostgreSQL',
      provider: 'postgresql',
      credentials_fields: [
        { name: 'URI', label: 'URI', required: true, type: 'string' },
        { name: 'CA_CERT', label: 'CA certificate', required: false, type: 'string' },
      ],
    },
    status: { flight_ready: true },
  },
  {
    metadata: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-08T16:00:00Z',
    },
    resource: { name: 'S3', provider: 's3', credentials_fields: [] },
    status: { flight_ready: true },
  },
];

const newConnection = {
  metadata: { id: '550e8400-e29b-41d4-a716-446655440005' },
  resource: {
    name: 'analytics',
    data_connection_type_id: '550e8400-e29b-41d4-a716-446655440006',
    format: 'tabular' as const,
    credentials_ref: { secret: 'analytics' },
  },
  status: { state: 'ready' as const },
};

const newConnectionType = {
  metadata: {
    id: '550e8400-e29b-41d4-a716-446655440006',
    created_at: '2026-09-08T16:00:00Z',
    updated_at: '2026-09-08T16:00:00Z',
  },
  resource: { name: 'Snowflake', provider: 'snowflake', credentials_fields: [] },
};

describe('ConnectionsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(trackingUtilities.fireDataConnectHubTrackEvent).mockImplementation(mockTrackEvent);
    mockVerifyConnection.mockImplementation(() => () => Promise.resolve());
    mockDeleteConnection.mockImplementation(() => () => Promise.resolve());
    mockUseConnections.mockReturnValue([connections, true, undefined, jest.fn()]);
    mockUseConnectionTypes.mockReturnValue([connectionTypes, true, undefined]);
    mockUseNamespaces.mockReturnValue([[{ name: 'test-project' }], true, undefined]);
  });

  it('keeps manually deselected types deselected during polling', () => {
    expect(
      synchronizeTypeSelection(
        ['550e8400-e29b-41d4-a716-446655440003'],
        ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'],
      ),
    ).toEqual(['550e8400-e29b-41d4-a716-446655440003']);
  });

  it('keeps an absent type selection absent when types become available', () => {
    expect(synchronizeTypeSelection(null, ['type-one', 'type-two'])).toBeNull();
  });

  it('keeps an empty type selection empty when new types are discovered', () => {
    expect(synchronizeTypeSelection([], ['type-one', 'type-two'])).toEqual([]);
  });

  it('keeps a newly discovered type unselected while preserving existing selection', () => {
    expect(
      synchronizeTypeSelection(
        ['550e8400-e29b-41d4-a716-446655440003'],
        ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006'],
      ),
    ).toEqual(['550e8400-e29b-41d4-a716-446655440003']);
  });

  it('renders connection names and readable type names', () => {
    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Unverified')).toBeTruthy();
  });

  it('defaults the type filter to unselected without filtering connections', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('object-store')).toBeTruthy();
    expect(screen.queryByTestId('connections-type-filter-badge')).toBeNull();
    expect(screen.queryByTestId('connections-type-filter-labels')).toBeNull();

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    expect(
      within(screen.getByRole('menuitem', { name: 'PostgreSQL' })).getByRole('checkbox'),
    ).toHaveProperty('checked', false);
    expect(
      within(screen.getByRole('menuitem', { name: 'S3' })).getByRole('checkbox'),
    ).toHaveProperty('checked', false);
  });

  it('shows a count badge and filters by selected connection types', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    fireEvent.click(
      within(screen.getByRole('menuitem', { name: 'PostgreSQL' })).getByRole('checkbox'),
    );

    await waitFor(() =>
      expect(screen.getByTestId('connections-type-filter-badge').textContent).toBe('1'),
    );
    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.queryByText('object-store')).toBeNull();

    fireEvent.click(
      within(screen.getByRole('menuitem', { name: 'PostgreSQL' })).getByRole('checkbox'),
    );

    expect(screen.queryByTestId('connections-type-filter-badge')).toBeNull();
    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('object-store')).toBeTruthy();
  });

  it('clears the name and type filters from the empty state', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    fireEvent.click(
      within(screen.getByRole('menuitem', { name: 'PostgreSQL' })).getByRole('checkbox'),
    );
    await user.type(screen.getByRole('textbox', { name: 'Filter by name' }), 'no-match');

    expect(screen.getByText('No results found')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('object-store')).toBeTruthy();
    expect(screen.queryByTestId('connections-type-filter-badge')).toBeNull();

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    expect(
      within(screen.getByRole('menuitem', { name: 'PostgreSQL' })).getByRole('checkbox'),
    ).toHaveProperty('checked', false);
    expect(
      within(screen.getByRole('menuitem', { name: 'S3' })).getByRole('checkbox'),
    ).toHaveProperty('checked', false);
  });

  it('renders a newly created connection as unverified', () => {
    mockUseConnections.mockReturnValue([
      [
        {
          ...connections[0],
          status: {
            state: 'not_ready' as const,
            updated_at: '2026-09-06T16:00:00Z',
          },
        },
      ],
      true,
      undefined,
      jest.fn(),
    ]);

    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.getByText('Unverified')).toBeTruthy();
    expect(screen.queryByText(/Last tested/)).toBeNull();
  });

  it('renders connection detail links', () => {
    mockUseConnections.mockReturnValue([
      [
        {
          ...connections[0],
          metadata: { ...connections[0].metadata, id: '550e8400-e29b-41d4-a716-446655440001' },
        },
      ],
      true,
      undefined,
      jest.fn(),
    ]);

    render(
      <MemoryRouter initialEntries={['/connections?project=test-project']}>
        <Routes>
          <Route path="/connections" element={<ConnectionsTab namespace="test-project" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'warehouse' }).getAttribute('href')).toBe(
      '/connections/550e8400-e29b-41d4-a716-446655440001?project=test-project',
    );
  });

  it('opens the create connection wizard from the toolbar', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(screen.getByTestId('create-connection-tearsheet')).toBeTruthy();
    expect(screen.getAllByText('Connection type').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Connection details').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configuration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
  });

  it('tracks starting the create connection flow from the toolbar', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Connections Add Started',
      properties: { project: 'test-project', source: 'connections_tab' },
    });
  });

  it('tracks starting the create connection flow from the empty state', async () => {
    const user = userEvent.setup();
    mockUseConnections.mockReturnValue([[], true, undefined, jest.fn()]);
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Connections Add Started',
      properties: { project: 'test-project', source: 'empty_state' },
    });
  });

  it('disables connection polling while the Connections tab is inactive', () => {
    renderConnectionsTab({ namespace: 'test-project', isActive: false });

    expect(mockUseConnections).toHaveBeenCalledWith('test-project', false);
    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project', false);
  });

  it('filters connections by name', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.type(screen.getByRole('textbox', { name: 'Filter by name' }), 'object');

    expect(screen.queryByText('warehouse')).toBeNull();
    expect(screen.getByText('object-store')).toBeTruthy();
  });

  it('tracks a name filter after typing stops', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderConnectionsTab({ namespace: 'test-project' });

      await user.type(screen.getByRole('textbox', { name: 'Filter by name' }), 'object');
      expect(mockTrackEvent).not.toHaveBeenCalledWith({
        eventName: 'Connections List Filter Applied',
        properties: { filterType: 'name', project: 'test-project' },
      });

      jest.advanceTimersByTime(750);

      expect(mockTrackEvent).toHaveBeenCalledWith({
        eventName: 'Connections List Filter Applied',
        properties: { filterType: 'name', project: 'test-project' },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('tracks clearing a name filter once when cleared before the debounce fires', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderConnectionsTab({ namespace: 'test-project' });

      await user.type(screen.getByRole('textbox', { name: 'Filter by name' }), 'object');
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      jest.advanceTimersByTime(750);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({
        eventName: 'Connections List Filter Applied',
        properties: { filterType: 'name', project: 'test-project' },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancels name-filter tracking when clearing all filters before the debounce fires', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderConnectionsTab({ namespace: 'test-project' });

      await user.type(screen.getByRole('textbox', { name: 'Filter by name' }), 'no-match');
      await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
      jest.advanceTimersByTime(750);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('tracks a type filter when a type is deselected and reselected', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByTestId('connection-type-filter-toggle'));
    const postgresqlFilter = screen.getByRole('menuitem', { name: 'PostgreSQL' });
    fireEvent.click(within(postgresqlFilter).getByRole('checkbox'));

    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.queryByText('object-store')).toBeNull();
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Connections List Filter Applied',
      properties: { filterType: 'type', project: 'test-project' },
    });

    fireEvent.click(within(postgresqlFilter).getByRole('checkbox'));

    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('object-store')).toBeTruthy();
  });

  it('refreshes the list when verification fails', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    mockUseConnections.mockReturnValue([connections, true, undefined, refresh]);
    mockVerifyConnection.mockImplementation(
      () => () => Promise.reject(new Error('verification failed')),
    );
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    await user.click(screen.getByRole('menuitem', { name: 'Verify connection' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('refreshes and closes the modal after a successful delete', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    mockUseConnections.mockReturnValue([connections, true, undefined, refresh]);
    mockDeleteConnection.mockImplementation(() => (_opts, _namespace, _id) => Promise.resolve());
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByTestId('delete-modal')).toBeNull();
  });

  it('tracks delete initiation without the connection name', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Connections Connection Delete Initiated',
      properties: { project: 'test-project', connectionTypeProvider: 'postgresql' },
    });
  });

  it('ignores a stale delete completion after the modal is replaced', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    let resolveFirst: () => void = () => undefined;
    let resolveSecond: () => void = () => undefined;
    const firstDelete = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const secondDelete = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });
    mockUseConnections.mockReturnValue([connections, true, undefined, refresh]);
    mockDeleteConnection.mockImplementation(
      () => (_opts, _namespace, id) =>
        id === '550e8400-e29b-41d4-a716-446655440001' ? firstDelete : secondDelete,
    );
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByTestId('delete-confirm'));
    await user.click(screen.getByTestId('delete-close'));

    await user.click(screen.getByRole('button', { name: 'Actions for object-store' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByTestId('delete-confirm'));

    resolveFirst();
    await Promise.resolve();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('delete-modal')).toBeTruthy();

    resolveSecond();
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('delete-modal')).toBeNull();
  });

  it('keeps newly discovered connection types unselected after polling', async () => {
    const user = userEvent.setup();
    const { rerender } = renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    fireEvent.click(within(screen.getByRole('menuitem', { name: 'S3' })).getByRole('checkbox'));
    mockUseConnections.mockReturnValue([
      [...connections, newConnection],
      true,
      undefined,
      jest.fn(),
    ]);
    mockUseConnectionTypes.mockReturnValue([
      [...connectionTypes, newConnectionType],
      true,
      undefined,
    ]);
    rerender(
      <MemoryRouter>
        <ConnectionsTab namespace="test-project" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('connections-type-filter-badge').textContent).toBe('1');
    expect(screen.getByText('object-store')).toBeTruthy();
    expect(screen.queryByText('warehouse')).toBeNull();
    expect(screen.queryByText('analytics')).toBeNull();
    expect(
      within(screen.getByRole('menuitem', { name: 'Snowflake' })).getByRole('checkbox'),
    ).toHaveProperty('checked', false);
  });

  it('resets type selections when the project changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <ConnectionsTab key="project-one" namespace="project-one" />
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'S3' }));

    mockUseConnections.mockReturnValue([[connections[1]], true, undefined, jest.fn()]);
    mockUseConnectionTypes.mockReturnValue([[connectionTypes[1]], true, undefined]);
    rerender(
      <MemoryRouter>
        <ConnectionsTab key="project-two" namespace="project-two" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Type' })[0]).toBeTruthy());
    expect(screen.getByText('object-store')).toBeTruthy();
  });

  it('shows the designed empty state when the project has no connections', async () => {
    const user = userEvent.setup();
    mockUseConnections.mockReturnValue([[], true, undefined, jest.fn()]);

    renderConnectionsTab({ namespace: 'empty-project' });

    expect(screen.getByText('Get started with data connections')).toBeTruthy();
    expect(
      screen.getByText(
        'Create a connection in this project to link storage credentials to catalog assets and workloads.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Filter by name' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Create connection' }));
    expect(screen.getByTestId('create-connection-tearsheet')).toBeTruthy();
  });
});
