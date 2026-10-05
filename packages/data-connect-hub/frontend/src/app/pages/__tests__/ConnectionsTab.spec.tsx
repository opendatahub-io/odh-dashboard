import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ConnectionsTab, { synchronizeTypeSelection } from '~/app/pages/ConnectionsTab';
import CreateConnectionWizard, { getPropertyErrors } from '~/app/components/CreateConnectionWizard';
import { useConnections } from '~/app/hooks/useConnections';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import { deleteConnection, testCredentials, verifyConnection } from '~/app/api/dch';

jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('~/app/hooks/useNamespaces');
const mockNotificationSuccess = jest.fn();
const mockNotificationError = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: mockNotificationSuccess, error: mockNotificationError }),
}));
jest.mock('~/app/api/dch', () => ({
  createConnection: jest.fn(),
  deleteConnection: jest.fn(),
  verifyConnection: jest.fn(),
  testCredentials: jest.fn(),
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
const mockTestCredentials = jest.mocked(testCredentials);

const connections = [
  {
    metadata: { id: 'connection-1' },
    resource: {
      name: 'warehouse',
      data_connection_type_id: 'postgresql',
      format: 'tabular' as const,
    },
    status: { state: 'ready' as const, updated_at: '2026-09-08T16:00:00Z' },
  },
  {
    metadata: { id: 'connection-2' },
    resource: { name: 'object-store', data_connection_type_id: 's3', format: 'binary' as const },
    status: { state: 'not_ready' as const },
  },
];

const connectionTypes = [
  {
    metadata: {
      id: 'postgresql',
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
  },
  {
    metadata: {
      id: 's3',
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-08T16:00:00Z',
    },
    resource: { name: 'S3', provider: 's3', credentials_fields: [] },
  },
];

const newConnection = {
  metadata: { id: 'connection-3' },
  resource: { name: 'analytics', data_connection_type_id: 'snowflake', format: 'tabular' as const },
  status: { state: 'ready' as const },
};

const newConnectionType = {
  metadata: {
    id: 'snowflake',
    created_at: '2026-09-08T16:00:00Z',
    updated_at: '2026-09-08T16:00:00Z',
  },
  resource: { name: 'Snowflake', provider: 'snowflake', credentials_fields: [] },
};

describe('ConnectionsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyConnection.mockImplementation(() => () => Promise.resolve());
    mockDeleteConnection.mockImplementation(() => () => Promise.resolve());
    mockTestCredentials.mockImplementation(() => () => Promise.resolve());
    mockUseConnections.mockReturnValue([connections, true, undefined, jest.fn()]);
    mockUseConnectionTypes.mockReturnValue([connectionTypes, true, undefined]);
    mockUseNamespaces.mockReturnValue([[{ name: 'test-project' }], true, undefined]);
  });

  it('keeps manually deselected types deselected during polling', () => {
    expect(
      synchronizeTypeSelection(['postgresql'], ['postgresql', 's3'], ['postgresql', 's3']),
    ).toEqual(['postgresql']);
  });

  it('adds a newly discovered type while preserving existing selection', () => {
    expect(
      synchronizeTypeSelection(['postgresql'], ['postgresql'], ['postgresql', 'snowflake']),
    ).toEqual(['postgresql', 'snowflake']);
  });

  it('rejects duplicate normalized and whitespace-only property keys', () => {
    expect(
      getPropertyErrors([
        { id: 1, key: ' key ', value: 'one' },
        { id: 2, key: 'key', value: 'two' },
        { id: 3, key: '   ', value: 'three' },
      ]),
    ).toEqual({ 1: 'Key must be unique.', 2: 'Key must be unique.', 3: 'Key is required.' });
  });

  it('renders connection names and readable type names', () => {
    render(<ConnectionsTab namespace="test-project" />);

    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Unverified')).toBeTruthy();
  });

  it('opens the create connection wizard from the toolbar', async () => {
    const user = userEvent.setup();
    render(<ConnectionsTab namespace="test-project" />);

    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(screen.getByTestId('create-connection-tearsheet')).toBeTruthy();
    expect(screen.getAllByText('Connection type').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Connection details').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configuration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toHaveProperty('disabled', true);

    await user.click(
      within(screen.getByTestId('postgresql--ConnectionTypeCard')).getByRole('radio', {
        hidden: true,
      }),
    );

    expect(nextButton).toHaveProperty('disabled', false);
    await user.click(nextButton);
    expect(screen.getByTestId('connection-project-select')).toBeTruthy();
    expect(screen.getByTestId('connection-name-input')).toBeTruthy();
    expect(nextButton).toHaveProperty('disabled', true);

    await user.type(screen.getByTestId('connection-name-input'), 'warehouse');

    expect(nextButton).toHaveProperty('disabled', false);
    await user.click(nextButton);
    expect(screen.getByTestId('credential-URI')).toBeTruthy();
    expect(nextButton).toHaveProperty('disabled', true);

    await user.type(screen.getByTestId('credential-URI'), 'postgres://example');

    expect(nextButton).toHaveProperty('disabled', false);
    await user.click(screen.getByTestId('verify-connection-button'));
    expect(mockTestCredentials).toHaveBeenCalled();
    expect(await screen.findByText('Connection successful')).toBeTruthy();
  });

  it('loads connection types when the create connection modal opens', () => {
    const { rerender } = render(
      <CreateConnectionWizard isOpen={false} namespace="test-project" onClose={jest.fn()} />,
    );

    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project', false);

    rerender(<CreateConnectionWizard isOpen namespace="test-project" onClose={jest.fn()} />);

    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project', true);
  });

  it('starts with a blank wizard after the modal is cancelled', async () => {
    const user = userEvent.setup();
    render(<ConnectionsTab namespace="test-project" />);

    await user.click(screen.getByRole('button', { name: 'Create connection' }));
    await user.click(
      within(screen.getByTestId('postgresql--ConnectionTypeCard')).getByRole('radio', {
        hidden: true,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Close wizard' }));
    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true);
  });

  it('shows an error when connection creation fails', async () => {
    const user = userEvent.setup();
    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        onCreate={() => Promise.reject(new Error('creation failed'))}
      />,
    );

    await user.click(
      within(screen.getByTestId('postgresql--ConnectionTypeCard')).getByRole('radio', {
        hidden: true,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: /Add key.?value pair/ }));
    await user.click(screen.getByRole('button', { name: /Add key.?value pair/ }));
    await user.type(screen.getByTestId('connection-property-key-1'), 'first');
    await user.type(screen.getByTestId('connection-property-value-1'), 'one');
    await user.type(screen.getByTestId('connection-property-key-2'), 'second');
    await user.type(screen.getByTestId('connection-property-value-2'), 'two');
    expect(screen.getByTestId('connection-property-key-1')).toBeTruthy();
    expect(screen.getByTestId('connection-property-value-2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove property first' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 'postgres://example');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Summary')).toBeTruthy();
    expect(screen.getByText('Connection name')).toBeTruthy();
    expect(screen.getByText('Project')).toBeTruthy();
    expect(screen.getAllByText('Connection type').length).toBeGreaterThan(0);
    expect(screen.getByText('Global')).toBeTruthy();
    expect(screen.getAllByText('Verify connection').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    await waitFor(() =>
      expect(mockNotificationError).toHaveBeenCalledWith(
        'Unable to create connection',
        'creation failed',
      ),
    );
    expect(screen.getByTestId('create-connection-tearsheet')).toBeTruthy();
  });

  it('disables connection polling while the Registry tab is inactive', () => {
    render(<ConnectionsTab namespace="test-project" isActive={false} />);

    expect(mockUseConnections).toHaveBeenCalledWith('test-project', false);
    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project', false);
  });

  it('filters connections by name', async () => {
    const user = userEvent.setup();
    render(<ConnectionsTab namespace="test-project" />);

    await user.type(screen.getByRole('textbox', { name: 'Filter by name' }), 'object');

    expect(screen.queryByText('warehouse')).toBeNull();
    expect(screen.getByText('object-store')).toBeTruthy();
  });

  it('refreshes the list when verification fails', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    mockUseConnections.mockReturnValue([connections, true, undefined, refresh]);
    mockVerifyConnection.mockImplementation(
      () => () => Promise.reject(new Error('verification failed')),
    );
    render(<ConnectionsTab namespace="test-project" />);

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    await user.click(screen.getByRole('menuitem', { name: 'Verify connection' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('refreshes and closes the modal after a successful delete', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    mockUseConnections.mockReturnValue([connections, true, undefined, refresh]);
    mockDeleteConnection.mockImplementation(() => (_opts, _namespace, _id) => Promise.resolve());
    render(<ConnectionsTab namespace="test-project" />);

    await user.click(screen.getByRole('button', { name: 'Actions for warehouse' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await user.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByTestId('delete-modal')).toBeNull();
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
      () => (_opts, _namespace, id) => (id === 'connection-1' ? firstDelete : secondDelete),
    );
    render(<ConnectionsTab namespace="test-project" />);

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

  it('includes newly discovered connection types after polling', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ConnectionsTab namespace="test-project" />);

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'S3' }));
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
    rerender(<ConnectionsTab namespace="test-project" />);

    await waitFor(() => expect(screen.getByText('analytics')).toBeTruthy());
  });

  it('resets type selections when the project changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ConnectionsTab key="project-one" namespace="project-one" />);

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'S3' }));

    mockUseConnections.mockReturnValue([[connections[1]], true, undefined, jest.fn()]);
    mockUseConnectionTypes.mockReturnValue([[connectionTypes[1]], true, undefined]);
    rerender(<ConnectionsTab key="project-two" namespace="project-two" />);

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Type' })[0]).toBeTruthy());
    expect(screen.getByText('object-store')).toBeTruthy();
  });

  it('shows the designed empty state when the project has no connections', async () => {
    const user = userEvent.setup();
    mockUseConnections.mockReturnValue([[], true, undefined, jest.fn()]);

    render(<ConnectionsTab namespace="empty-project" />);

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
