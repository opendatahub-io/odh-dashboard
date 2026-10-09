import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import CreateConnectionWizard, { getPropertyErrors } from '~/app/components/CreateConnectionWizard';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import { testCredentials } from '~/app/api/dch';
import type { CreateConnectionRequest } from '~/app/types';

jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('~/app/hooks/useNamespaces');
const mockNotificationSuccess = jest.fn();
const mockNotificationError = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: mockNotificationSuccess, error: mockNotificationError }),
}));
jest.mock('~/app/api/dch', () => ({
  testCredentials: jest.fn(),
}));

const mockUseConnectionTypes = jest.mocked(useConnectionTypes);
const mockUseNamespaces = jest.mocked(useNamespaces);
const mockTestCredentials = jest.mocked(testCredentials);

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
      credentials_fields: [{ name: 'URI', label: 'URI', required: true, type: 'string' }],
    },
    status: { flight_ready: true },
  },
  {
    metadata: {
      id: 'oci-v1',
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-08T16:00:00Z',
    },
    resource: { name: 'OCI', provider: 'oci', credentials_fields: [] },
    status: { flight_ready: false },
  },
];

describe('CreateConnectionWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTestCredentials.mockImplementation(() => () => Promise.resolve());
    mockUseConnectionTypes.mockReturnValue([connectionTypes, true, undefined]);
    mockUseNamespaces.mockReturnValue([[{ name: 'test-project' }], true, undefined]);
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

  it('loads connection types only when the wizard is open', () => {
    const { rerender } = render(
      <CreateConnectionWizard isOpen={false} namespace="test-project" onClose={jest.fn()} />,
    );

    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project', false);

    rerender(<CreateConnectionWizard isOpen namespace="test-project" onClose={jest.fn()} />);

    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project', true);
  });

  it('should start at connection details when an initial connection type is selected', async () => {
    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        initialFormData={{ data_connection_type_id: 'postgresql' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
    expect(screen.getByTestId('connection-project-select').textContent).toContain('test-project');
    expect((screen.getByTestId('connection-name-input') as HTMLInputElement).value).toBe('');
  });

  it('should remain on connection type when a prefilled connection type fails to load', async () => {
    mockUseConnectionTypes.mockReturnValue([[], false, new Error('request failed')]);

    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        initialFormData={{ data_connection_type_id: 'postgresql' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection type' })).toBeTruthy();
    expect(screen.getByText('Unable to load connection types')).toBeTruthy();
    expect(screen.getByText('request failed')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Connection details' })).toBeNull();
  });

  it.each([undefined, 'postgres://supplied', ''])(
    'should merge asynchronously loaded credential defaults while preserving supplied values (%s)',
    async (suppliedUri) => {
      const user = userEvent.setup();
      const onCreate =
        jest.fn<(data: CreateConnectionRequest, selectedNamespace: string) => void>();
      mockUseConnectionTypes.mockReturnValue([[], false, undefined]);
      const credentialProperties: Record<string, string> =
        suppliedUri === undefined ? {} : { URI: suppliedUri };
      const props = {
        namespace: 'test-project',
        onClose: jest.fn(),
        onCreate,
        initialFormData: {
          data_connection_type_id: 'postgresql',
          credentials: {
            secret: '',
            properties: credentialProperties,
          },
        },
      };
      const { rerender } = render(<CreateConnectionWizard {...props} isOpen />);

      mockUseConnectionTypes.mockReturnValue([
        [
          {
            ...connectionTypes[0],
            resource: {
              ...connectionTypes[0].resource,
              credentials_fields: [
                {
                  name: 'URI',
                  label: 'URI',
                  required: true,
                  type: 'string',
                  default_value: 'postgres://default',
                },
                {
                  name: 'SSL_MODE',
                  label: 'SSL mode',
                  required: false,
                  type: 'string',
                  default_value: 'require',
                },
              ],
            },
          },
        ],
        true,
        undefined,
      ]);
      rerender(<CreateConnectionWizard {...props} isOpen />);

      expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
      await user.type(screen.getByTestId('connection-name-input'), 'warehouse');
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByTestId('credential-URI')).toHaveProperty(
        'value',
        suppliedUri ?? 'postgres://default',
      );
      expect(screen.getByTestId('credential-SSL_MODE')).toHaveProperty('value', 'require');
      expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty(
        'disabled',
        suppliedUri === '',
      );
      if (suppliedUri === '') {
        return;
      }

      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Create connection' }));
      await waitFor(() =>
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            credentials: {
              secret: 'warehouse',
              properties: { URI: suppliedUri ?? 'postgres://default', SSL_MODE: 'require' },
            },
          }),
          'test-project',
        ),
      );
    },
  );

  it('should remain on connection type when a prefilled connection type is unknown', async () => {
    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        initialFormData={{ data_connection_type_id: 'unknown' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection type' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('heading', { name: 'Connection details' })).toBeNull();
  });

  it('should show connection details when namespace loading fails for valid initial form data', async () => {
    mockUseNamespaces.mockReturnValue([[], false, new Error('namespace request failed')]);

    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        initialFormData={{
          name: 'existing-connection',
          data_connection_type_id: 'postgresql',
          credentials: {
            secret: 'existing-connection',
            properties: { URI: 'postgres://example' },
          },
          properties: { region: 'east' },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
    expect(screen.getByText('Unable to load projects')).toBeTruthy();
    expect(screen.getByText('namespace request failed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true);
  });

  it('should start at review when all initial form data is valid', async () => {
    const user = userEvent.setup();
    const onCreate = jest.fn<(data: CreateConnectionRequest, selectedNamespace: string) => void>();
    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        onCreate={onCreate}
        initialFormData={{
          name: 'existing-connection',
          data_connection_type_id: 'postgresql',
          credentials: {
            secret: 'existing-connection',
            properties: { URI: 'postgres://example' },
          },
          properties: { region: 'east' },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    expect(screen.getByText('existing-connection')).toBeTruthy();
    expect(screen.getByText('region: east')).toBeTruthy();
    expect(screen.queryByText('postgres://example')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show URI' }));
    expect(screen.getByText('postgres://example')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Create connection' }));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        {
          name: 'existing-connection',
          data_connection_type_id: 'postgresql',
          format: 'tabular',
          credentials: {
            secret: 'existing-connection',
            properties: { URI: 'postgres://example' },
          },
          properties: { region: 'east' },
        },
        'test-project',
      ),
    );
  });

  it('should resolve the initial step after merging required credential defaults', async () => {
    mockUseConnectionTypes.mockReturnValue([
      [
        {
          ...connectionTypes[0],
          resource: {
            ...connectionTypes[0].resource,
            credentials_fields: [
              {
                ...connectionTypes[0].resource.credentials_fields[0],
                default_value: 'default-uri',
              },
            ],
          },
        },
      ],
      true,
      undefined,
    ]);

    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        initialFormData={{ data_connection_type_id: 'postgresql', name: 'warehouse' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create connection' })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('should reset to the supplied initial form data after closing', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const props = {
      namespace: 'test-project',
      onClose,
      initialFormData: { data_connection_type_id: 'postgresql' },
    };
    const { rerender } = render(<CreateConnectionWizard {...props} isOpen />);

    expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
    await user.type(screen.getByTestId('connection-name-input'), 'temporary-name');
    await user.click(screen.getByRole('button', { name: 'Close wizard' }));

    rerender(<CreateConnectionWizard {...props} isOpen={false} />);
    rerender(<CreateConnectionWizard {...props} isOpen />);

    expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
    expect((screen.getByTestId('connection-name-input') as HTMLInputElement).value).toBe('');
  });

  it('should apply the latest initial data on open without overwriting session edits', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { rerender } = render(
      <CreateConnectionWizard isOpen={false} namespace="test-project" onClose={onClose} />,
    );

    rerender(
      <CreateConnectionWizard
        isOpen={false}
        namespace="test-project"
        onClose={onClose}
        initialFormData={{ data_connection_type_id: 'postgresql' }}
      />,
    );
    rerender(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={onClose}
        initialFormData={{ data_connection_type_id: 'postgresql' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
    await user.type(screen.getByTestId('connection-name-input'), 'session-edit');

    rerender(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={onClose}
        initialFormData={{ data_connection_type_id: 'oci-v1', name: 'updated-prop' }}
      />,
    );

    expect((screen.getByTestId('connection-name-input') as HTMLInputElement).value).toBe(
      'session-edit',
    );
  });

  it('should preserve prefilled properties when adding another property', async () => {
    const user = userEvent.setup();
    render(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={jest.fn()}
        initialFormData={{
          data_connection_type_id: 'postgresql',
          properties: { region: 'east' },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
    expect((screen.getByTestId('connection-property-key-1') as HTMLInputElement).value).toBe(
      'region',
    );
    expect((screen.getByTestId('connection-property-value-1') as HTMLInputElement).value).toBe(
      'east',
    );

    await user.type(screen.getByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Add key-value pair' }));
    await user.type(screen.getByTestId('connection-property-key-2'), 'zone');
    await user.type(screen.getByTestId('connection-property-value-2'), 'west');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 'postgres://example');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('region: east')).toBeTruthy();
    expect(screen.getByText('zone: west')).toBeTruthy();
  });

  it('starts with a blank wizard after the modal is cancelled', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { rerender } = render(
      <CreateConnectionWizard isOpen namespace="test-project" onClose={onClose} />,
    );

    await user.click(
      within(screen.getByTestId('postgresql--ConnectionTypeCard')).getByRole('radio', {
        hidden: true,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Close wizard' }));
    expect(onClose).toHaveBeenCalled();
    rerender(<CreateConnectionWizard isOpen={false} namespace="test-project" onClose={onClose} />);
    rerender(<CreateConnectionWizard isOpen namespace="test-project" onClose={onClose} />);

    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true);
  });

  it('shows verification for a flight-ready connection type', async () => {
    const user = userEvent.setup();
    render(<CreateConnectionWizard isOpen namespace="test-project" onClose={jest.fn()} />);

    await user.click(
      within(screen.getByTestId('postgresql--ConnectionTypeCard')).getByRole('radio', {
        hidden: true,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('connection-name-input'), 'warehouse');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 'postgres://example');

    expect(screen.getByTestId('verify-connection-button')).toBeTruthy();
    await user.click(screen.getByTestId('verify-connection-button'));
    expect(mockTestCredentials).toHaveBeenCalled();
    expect(await screen.findByText('Connection successful')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Verification is intentionally available only on Configuration, never Review.
    expect(screen.queryByTestId('verify-connection-button')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Verify connection' })).toBeNull();
  });

  it('does not show verification for a non-flight-ready connection type', async () => {
    const user = userEvent.setup();
    render(<CreateConnectionWizard isOpen namespace="test-project" onClose={jest.fn()} />);

    await user.click(
      within(screen.getByTestId('oci-v1--ConnectionTypeCard')).getByRole('radio', {
        hidden: true,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('connection-name-input'), 'object-store');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.queryByTestId('verify-connection-button')).toBeNull();
    expect(mockTestCredentials).not.toHaveBeenCalled();
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
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByTestId('credential-URI'), 'postgres://example');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Create connection' }));

    await waitFor(() =>
      expect(mockNotificationError).toHaveBeenCalledWith(
        'Unable to create connection',
        'creation failed',
      ),
    );
  });
});
