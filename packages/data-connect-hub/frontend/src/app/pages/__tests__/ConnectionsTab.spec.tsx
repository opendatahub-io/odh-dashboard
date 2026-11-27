import React from 'react';
import { fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ConnectionsTab, { synchronizeTypeSelection } from '~/app/pages/ConnectionsTab';
import TrackingProvider from '~/__tests__/unit/testUtils/TrackingProvider';
import { useConnections } from '~/app/hooks/useConnections';
import { useConnectionAccess } from '~/app/hooks/useConnectionAccess';
import {
  ConnectionApiError,
  createConnection,
  deleteConnection,
  verifyConnection,
} from '~/app/api/dch';
import { ConnectionTypeInstance } from '~/app/components/ConnectionType.tsx';
import CreateConnectionWizard from '~/app/components/CreateConnectionWizard';
import type { CreateConnectionRequest } from '~/app/types';

jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/hooks/useConnectionAccess');
jest.mock('~/app/components/CreateConnectionWizard', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('~/app/api/dch', () => ({
  ...jest.requireActual<typeof import('~/app/api/dch')>('~/app/api/dch'),
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
const mockUseConnectionAccess = jest.mocked(useConnectionAccess);
const mockCreateConnectionWizard = jest.mocked(CreateConnectionWizard);
const mockCreateConnection = jest.mocked(createConnection);
const mockCreateRequest = jest.fn<ReturnType<typeof createConnection>>();
const mockVerifyConnection = jest.mocked(verifyConnection);
const mockDeleteConnection = jest.mocked(deleteConnection);
const mockTrackEvent = jest.fn();
const TrackingWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <TrackingProvider trackEvent={mockTrackEvent}>{children}</TrackingProvider>
);
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: TrackingWrapper });

const renderConnectionsTab = (props: React.ComponentProps<typeof ConnectionsTab>) =>
  render(
    <MemoryRouter>
      <ConnectionsTab {...props} />
    </MemoryRouter>,
  );

const baseConnections = [
  {
    metadata: { id: '550e8400-e29b-41d4-a716-446655440001' },
    resource: {
      name: 'warehouse',
      description: 'Sales data warehouse',
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
  new ConnectionTypeInstance({
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
  }),
  new ConnectionTypeInstance({
    metadata: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-08T16:00:00Z',
    },
    resource: { name: 'S3', provider: 's3', credentials_fields: [] },
    status: { flight_ready: true },
  }),
];

const connections = baseConnections.map((connection, index) => ({
  ...connection,
  resource: { ...connection.resource, data_connection_type: connectionTypes[index] },
}));

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

const newConnectionType = new ConnectionTypeInstance({
  metadata: {
    id: '550e8400-e29b-41d4-a716-446655440006',
    created_at: '2026-09-08T16:00:00Z',
    updated_at: '2026-09-08T16:00:00Z',
  },
  resource: { name: 'Snowflake', provider: 'snowflake', credentials_fields: [] },
});

const createRequest: CreateConnectionRequest = {
  name: 'warehouse',
  data_connection_type_id: '550e8400-e29b-41d4-a716-446655440003',
  format: 'tabular',
  credentials: { secret: 'warehouse', properties: { URI: 'postgres://example' } },
  properties: {},
};

describe('ConnectionsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyConnection.mockImplementation(() => () => Promise.resolve());
    mockDeleteConnection.mockImplementation(() => () => Promise.resolve());
    mockUseConnections.mockReturnValue([connections, true, undefined, jest.fn()]);
    mockCreateConnection.mockReturnValue(mockCreateRequest);
    mockCreateRequest.mockResolvedValue(connections[0]);
    mockCreateConnectionWizard.mockImplementation(({ isOpen, onClose }) =>
      isOpen ? (
        <div data-testid="mock-create-connection-wizard">
          <button type="button" onClick={onClose}>
            Close mocked wizard
          </button>
        </div>
      ) : null,
    );
    mockUseConnectionAccess.mockReturnValue({ isAllowed: true, loaded: true });
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

    expect(mockUseConnections).toHaveBeenCalledWith('test-project', true, {
      resolveConnectionTypes: true,
    });
    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('Sales data warehouse')).toBeTruthy();
    expect(screen.getAllByTestId('connection-name-description')).toHaveLength(1);
    expect(screen.getByTestId('connection-name-description').classList).toContain(
      'pf-v6-u-font-size-sm',
    );
    const descriptionText = screen.getByTestId('connection-name-description-text');
    expect(descriptionText.style.webkitLineClamp).toBe('2');
    expect(descriptionText.style.whiteSpace).toBe('pre-wrap');
    expect(descriptionText.tabIndex).toBe(0);
    const descriptionContent = Array.from(descriptionText.querySelectorAll('span')).find(
      (element) => element.style.whiteSpace === 'pre-wrap',
    );
    expect(descriptionContent?.style.overflowWrap).toBe('anywhere');
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Unverified')).toBeTruthy();
  });

  it('falls back to type IDs when resolved types are absent', () => {
    mockUseConnections.mockReturnValue([baseConnections, true, undefined, jest.fn()]);

    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.getByText(baseConnections[0].resource.data_connection_type_id)).toBeTruthy();
    expect(screen.getByText('warehouse')).toBeTruthy();
  });

  it('shows the loading state while fetching resolved connections', () => {
    mockUseConnections.mockReturnValue([[], false, undefined, jest.fn()]);

    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.getByText('Loading data connections')).toBeTruthy();
  });

  it('shows an error when fetching resolved connections fails', () => {
    mockUseConnections.mockReturnValue([[], false, new Error('Resolution failed'), jest.fn()]);

    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.getByText('Unable to load data connections')).toBeTruthy();
    expect(screen.getByText('Resolution failed')).toBeTruthy();
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

  it('opens and closes the create connection wizard from the toolbar', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.queryByTestId('mock-create-connection-wizard')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(screen.getByTestId('mock-create-connection-wizard')).toBeTruthy();
    expect(mockCreateConnectionWizard.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ isOpen: true, namespace: 'test-project' }),
    );

    await user.click(screen.getByRole('button', { name: 'Close mocked wizard' }));

    expect(screen.queryByTestId('mock-create-connection-wizard')).toBeNull();
    expect(mockCreateConnectionWizard.mock.lastCall?.[0].isOpen).toBe(false);
  });

  it('creates a connection in the selected namespace, refreshes, and returns the connection', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    mockUseConnections.mockReturnValue([connections, true, undefined, refresh]);
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Create connection' }));
    const onCreate = mockCreateConnectionWizard.mock.lastCall?.[0].onCreate;

    await expect(onCreate?.(createRequest, 'new-project')).resolves.toBe(connections[0]);

    expect(mockCreateConnection).toHaveBeenCalledWith('');
    expect(mockCreateRequest).toHaveBeenCalledWith({}, 'new-project', createRequest);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('passes creation failures to the wizard without refreshing the list', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    const error = new Error('Creation failed');
    mockCreateRequest.mockRejectedValue(error);
    mockUseConnections.mockReturnValue([connections, true, undefined, refresh]);
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Create connection' }));
    const onCreate = mockCreateConnectionWizard.mock.lastCall?.[0].onCreate;

    await expect(onCreate?.(createRequest, 'new-project')).rejects.toBe(error);

    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('mock-create-connection-wizard')).toBeTruthy();
  });

  it('tracks starting the create connection flow from the toolbar', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(mockTrackEvent).toHaveBeenCalledWith('Connections Add Started', {
      project: 'test-project',
      source: 'connections_tab',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks starting the create connection flow from the empty state', async () => {
    const user = userEvent.setup();
    mockUseConnections.mockReturnValue([[], true, undefined, jest.fn()]);
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(mockTrackEvent).toHaveBeenCalledWith('Connections Add Started', {
      project: 'test-project',
      source: 'empty_state',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('disables creating a connection when the user has read-only access', async () => {
    const user = userEvent.setup();
    mockUseConnectionAccess.mockReturnValue({ isAllowed: false, loaded: true });
    renderConnectionsTab({ namespace: 'test-project' });

    const button = screen.getByRole('button', { name: 'Create connection' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    await user.hover(button);
    expect(
      screen.getByText(
        'This action requires the create permission. To request permission, contact your administrator.',
      ),
    ).toBeTruthy();

    fireEvent.click(button);
    expect(screen.queryByTestId('mock-create-connection-wizard')).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalledWith('Connections Add Started', {
      project: 'test-project',
      source: 'connections_tab',
    });
  });

  it('disables creating a connection while access is loading', () => {
    mockUseConnectionAccess.mockReturnValue({ isAllowed: false, loaded: false });
    renderConnectionsTab({ namespace: 'test-project' });

    const button = screen.getByRole('button', { name: 'Create connection' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('disables connection polling while the Connections tab is inactive', () => {
    renderConnectionsTab({ namespace: 'test-project', isActive: false });

    expect(mockUseConnections).toHaveBeenCalledWith('test-project', false, {
      resolveConnectionTypes: true,
    });
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
      expect(mockTrackEvent).not.toHaveBeenCalledWith('Connections List Filter Applied', {
        filterType: 'name',
        project: 'test-project',
      });

      jest.advanceTimersByTime(750);

      expect(mockTrackEvent).toHaveBeenCalledWith('Connections List Filter Applied', {
        filterType: 'name',
        project: 'test-project',
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
      expect(mockTrackEvent).toHaveBeenCalledWith('Connections List Filter Applied', {
        filterType: 'name',
        project: 'test-project',
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
    expect(mockTrackEvent).toHaveBeenCalledWith('Connections List Filter Applied', {
      filterType: 'type',
      project: 'test-project',
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
    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
    await user.hover(deleteItem);
    expect(
      screen.queryByText(
        'This action requires the delete permission. To request permission, contact your administrator.',
      ),
    ).toBeNull();
    await user.click(deleteItem);
    await user.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByTestId('delete-modal')).toBeNull();
  });

  it('tracks delete initiation without the connection name', async () => {
    const user = userEvent.setup();
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(mockTrackEvent).toHaveBeenCalledWith('Connections Connection Delete Initiated', {
      project: 'test-project',
      connectionTypeProvider: 'postgresql',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('disables deleting a connection when the user has read-only access', async () => {
    const user = userEvent.setup();
    mockUseConnectionAccess.mockReturnValue({ isAllowed: false, loaded: true });
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
    expect(deleteItem.getAttribute('aria-disabled')).toBe('true');

    await user.hover(deleteItem);
    expect(
      screen.getByText(
        'This action requires the delete permission. To request permission, contact your administrator.',
      ),
    ).toBeTruthy();

    fireEvent.click(deleteItem);
    expect(screen.queryByTestId('delete-modal')).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalledWith('Connections Connection Delete Initiated', {
      project: 'test-project',
      connectionTypeProvider: 'postgresql',
    });
  });

  it('disables verifying a connection when the user has read-only access', async () => {
    const user = userEvent.setup();
    mockUseConnectionAccess.mockReturnValue({ isAllowed: false, loaded: true });
    renderConnectionsTab({ namespace: 'test-project' });

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    const verifyItem = screen.getByRole('menuitem', { name: 'Verify connection' });
    expect(verifyItem.getAttribute('aria-disabled')).toBe('true');

    await user.hover(verifyItem);
    expect(
      screen.getByText(
        'This action requires the create permission. To request permission, contact your administrator.',
      ),
    ).toBeTruthy();

    fireEvent.click(verifyItem);
    expect(mockVerifyConnection).not.toHaveBeenCalled();
  });

  it('shows the unauthorized state when loading connections is forbidden', () => {
    mockUseConnections.mockReturnValue([
      [],
      false,
      new ConnectionApiError('Access forbidden', 403),
      jest.fn(),
    ]);

    renderConnectionsTab({ namespace: 'test-project' });

    expect(screen.getByTestId('unauthorized-error')).toBeTruthy();
    expect(screen.getByTestId('unauthorized-error-title')).toBeTruthy();
    expect(screen.queryByText('Unable to load data connections')).toBeNull();
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
      [
        ...connections,
        {
          ...newConnection,
          resource: { ...newConnection.resource, data_connection_type: newConnectionType },
        },
      ],
      true,
      undefined,
      jest.fn(),
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
    expect(screen.getByTestId('mock-create-connection-wizard')).toBeTruthy();
  });
});
