import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import EmbeddableCreateConnectionWizard from '~/app/components/EmbeddableCreateConnectionWizard';
import { ConnectionTypeInstance } from '~/app/components/ConnectionType';
import * as trackingUtilities from '~/app/utilities/tracking';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import { useCreateConnectionNamespaces } from '~/app/hooks/useCreateConnectionNamespaces';
import { useConnectionAccess } from '~/app/hooks/useConnectionAccess';
import { useConnectionNameAvailability } from '~/app/hooks/useConnectionNameAvailability';
import { createConnection } from '~/app/api/dch';
import type { Connection, NamespaceKind } from '~/app/types';

jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('~/app/hooks/useNamespaces');
jest.mock('~/app/hooks/useCreateConnectionNamespaces');
jest.mock('~/app/hooks/useConnectionAccess');
jest.mock('~/app/hooks/useConnectionNameAvailability');
jest.mock('~/app/utilities/tracking', () => ({
  ...jest.requireActual<typeof import('~/app/utilities/tracking')>('~/app/utilities/tracking'),
  fireDataConnectHubTrackEvent: jest.fn(),
}));
jest.mock('~/app/api/dch', () => ({
  createConnection: jest.fn(),
}));

const mockUseConnectionTypes = jest.mocked(useConnectionTypes);
const mockUseNamespaces = jest.mocked(useNamespaces);
const mockUseCreateConnectionNamespaces = jest.mocked(useCreateConnectionNamespaces);
const mockUseConnectionAccess = jest.mocked(useConnectionAccess);
const mockUseConnectionNameAvailability = jest.mocked(useConnectionNameAvailability);
const mockCreateConnection = jest.mocked(createConnection);

const connectionTypeId = '550e8400-e29b-41d4-a716-446655440003';
const databaseConnectionTypeId = '550e8400-e29b-41d4-a716-446655440004';

const connectionTypes = [
  new ConnectionTypeInstance({
    metadata: {
      id: connectionTypeId,
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-08T16:00:00Z',
    },
    resource: {
      name: 'S3',
      provider: 's3',
      credentials_fields: [{ name: 'URI', label: 'URI', required: true, type: 'string' }],
    },
    status: { flight_ready: true },
  }),
  new ConnectionTypeInstance({
    metadata: {
      id: databaseConnectionTypeId,
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-08T16:00:00Z',
    },
    resource: { name: 'PostgreSQL', provider: 'postgresql', credentials_fields: [] },
  }),
];

const createdConnection: Connection = {
  metadata: { id: 'connection-id' },
  resource: {
    name: 'warehouse',
    data_connection_type_id: connectionTypeId,
    format: 'tabular',
    credentials_ref: { secret: 'warehouse' },
  },
  status: { state: 'ready' },
};

describe('EmbeddableCreateConnectionWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectionTypes.mockReturnValue([connectionTypes, true, undefined]);
    mockUseNamespaces.mockReturnValue([
      [{ name: 'test-project', displayName: 'Test Project' } as NamespaceKind],
      true,
      undefined,
    ]);
    mockUseCreateConnectionNamespaces.mockImplementation((namespaces: NamespaceKind[]) => [
      namespaces,
      true,
      undefined,
    ]);
    mockUseConnectionAccess.mockReturnValue({ isAllowed: true, loaded: true });
    mockUseConnectionNameAvailability.mockReturnValue([
      { available: true, conflicts_with: [] },
      true,
      undefined,
    ]);
    jest.mocked(trackingUtilities.fireDataConnectHubTrackEvent).mockImplementation(jest.fn());
    mockCreateConnection.mockReturnValue(
      jest.fn<() => Promise<Connection>>().mockResolvedValue(createdConnection),
    );
  });

  it('renders the locked namespace as plain text and enables credential verification by default', async () => {
    const user = userEvent.setup();
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId={connectionTypeId}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Details' })).toBeTruthy();
    expect(screen.getByTestId('connection-project-value').textContent).toBe('Test Project');
    expect(screen.queryByTestId('connection-project-select')).toBeNull();
    expect(screen.queryByTestId('connection-project-access-popover-link')).toBeNull();

    await user.type(screen.getByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 's3://warehouse');

    expect(screen.getByTestId('verify-connection-button')).toHaveProperty('disabled', false);
  });

  it('renders a selectable namespace when namespace selection is enabled', async () => {
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId={connectionTypeId}
        isNamespaceSelectable
      />,
    );

    expect(await screen.findByTestId('connection-project-select')).toBeTruthy();
    expect(screen.queryByTestId('connection-project-value')).toBeNull();
  });

  it('can disable credential verification', async () => {
    const user = userEvent.setup();
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId={connectionTypeId}
        enableCredentialVerification={false}
      />,
    );

    await user.type(await screen.findByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 's3://warehouse');

    expect(screen.queryByTestId('verify-connection-button')).toBeNull();
  });

  it('disables credential verification when the user cannot create connections', async () => {
    mockUseConnectionAccess.mockReturnValue({ isAllowed: false, loaded: true });
    const user = userEvent.setup();
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId={connectionTypeId}
      />,
    );

    await user.type(await screen.findByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 's3://warehouse');

    expect(screen.getByTestId('verify-connection-button')).toHaveProperty('disabled', true);
  });

  it('creates through the Data Connect Hub BFF and reports the created connection', async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn<() => void>();
    const onClose = jest.fn();
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId={connectionTypeId}
        onCreated={onCreated}
        onClose={onClose}
      />,
    );

    await user.type(await screen.findByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 'postgres://warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdConnection, 'test-project'));
    expect(onClose).toHaveBeenCalledWith('created');
    expect(mockCreateConnection).toHaveBeenCalledWith('');
    expect(mockCreateConnection.mock.results[0]?.value).toHaveBeenCalledWith(
      {},
      'test-project',
      expect.objectContaining({ name: 'warehouse' }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText('Connection created')).toBeTruthy();
  });

  it('keeps a successful creation open-path isolated from a synchronous callback error', async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn(() => {
      throw new Error('callback failed');
    });
    const onCreatedError = jest.fn();
    const onClose = jest.fn();
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId={connectionTypeId}
        onCreated={onCreated}
        onCreatedError={onCreatedError}
        onClose={onClose}
      />,
    );

    await user.type(await screen.findByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 'postgres://warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdConnection, 'test-project'));
    expect(onCreatedError).toHaveBeenCalledWith(new Error('callback failed'));
    expect(onClose).toHaveBeenCalledWith('created');
    expect(await screen.findByText('Connection created')).toBeTruthy();
    expect(screen.queryByText('Unable to create connection')).toBeNull();
  });

  it('keeps a successful creation isolated from an asynchronous callback error', async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn(() => Promise.reject(new Error('callback failed')));
    const onCreatedError = jest.fn();
    const onClose = jest.fn();
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        initialConnectionTypeId={connectionTypeId}
        onCreated={onCreated}
        onCreatedError={onCreatedError}
        onClose={onClose}
      />,
    );

    await user.type(await screen.findByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 'postgres://warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    await waitFor(() => expect(onCreatedError).toHaveBeenCalledWith(new Error('callback failed')));
    expect(onClose).toHaveBeenCalledWith('created');
    expect(await screen.findByText('Connection created')).toBeTruthy();
    expect(screen.queryByText('Unable to create connection')).toBeNull();
  });

  it('filters connection types by provider', async () => {
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        connectionTypeProviders={['postgresql']}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Details' })).toBeTruthy();
    expect(screen.queryByText('S3')).toBeNull();
  });

  it('does not widen provider filtering when an invalid empty provider list is supplied', async () => {
    render(
      <EmbeddableCreateConnectionWizard
        isOpen
        namespace="test-project"
        connectionTypeProviders={[] as unknown as [string]}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection type' })).toBeTruthy();
    expect(screen.queryByText('S3')).toBeNull();
    expect(screen.queryByText('PostgreSQL')).toBeNull();
  });

  it('passes a tearsheet stacking level to the wizard', async () => {
    render(
      <EmbeddableCreateConnectionWizard isOpen namespace="test-project" tearsheetStackLevel={1} />,
    );

    expect(await screen.findByTestId('create-connection-tearsheet')).toBeTruthy();
    expect(document.querySelector('.pf-m-stack-level-1')).toBeTruthy();
  });
});
