import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ConnectionsTab, { synchronizeTypeSelection } from '~/app/pages/ConnectionsTab';
import { useConnections } from '~/app/hooks/useConnections';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { deleteConnection, verifyConnection } from '~/app/api/dch';

jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('~/app/api/dch', () => ({
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
const mockVerifyConnection = jest.mocked(verifyConnection);
const mockDeleteConnection = jest.mocked(deleteConnection);

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
  { metadata: { id: 'postgresql' }, resource: { name: 'PostgreSQL', provider: 'postgresql' } },
  { metadata: { id: 's3' }, resource: { name: 'S3', provider: 's3' } },
];

const newConnection = {
  metadata: { id: 'connection-3' },
  resource: { name: 'analytics', data_connection_type_id: 'snowflake', format: 'tabular' as const },
  status: { state: 'ready' as const },
};

const newConnectionType = {
  metadata: { id: 'snowflake' },
  resource: { name: 'Snowflake', provider: 'snowflake' },
};

describe('ConnectionsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyConnection.mockImplementation(() => () => Promise.resolve());
    mockDeleteConnection.mockImplementation(() => () => Promise.resolve());
    mockUseConnections.mockReturnValue([connections, true, undefined, jest.fn()]);
    mockUseConnectionTypes.mockReturnValue([connectionTypes, true, undefined]);
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

  it('renders connection names and readable type names', () => {
    render(<ConnectionsTab namespace="test-project" />);

    expect(screen.getByText('warehouse')).toBeTruthy();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Unverified')).toBeTruthy();
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

  it('shows the designed empty state when the project has no connections', () => {
    mockUseConnections.mockReturnValue([[], true, undefined, jest.fn()]);

    render(<ConnectionsTab namespace="empty-project" />);

    expect(screen.getByText('Get started with data connections')).toBeTruthy();
    expect(
      screen.getByText(
        'Create a connection in this project to link storage credentials to catalog assets and workloads.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Filter by name' })).toBeNull();
  });
});
