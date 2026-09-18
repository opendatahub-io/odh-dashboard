import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ConnectionsTab, { synchronizeTypeSelection } from '~/app/pages/ConnectionsTab';
import { useConnections } from '~/app/hooks/useConnections';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { verifyConnection } from '~/app/api/dch';

jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('~/app/api/dch', () => ({
  deleteConnection: jest.fn(),
  verifyConnection: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  DeleteModal: () => null,
}));

const mockUseConnections = jest.mocked(useConnections);
const mockUseConnectionTypes = jest.mocked(useConnectionTypes);
const mockVerifyConnection = jest.mocked(verifyConnection);

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
    const { rerender } = render(<ConnectionsTab namespace="project-one" />);

    await user.click(screen.getAllByRole('button', { name: 'Type' })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'S3' }));

    mockUseConnections.mockReturnValue([[connections[1]], true, undefined, jest.fn()]);
    mockUseConnectionTypes.mockReturnValue([[connectionTypes[1]], true, undefined]);
    rerender(<ConnectionsTab namespace="project-two" />);

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
