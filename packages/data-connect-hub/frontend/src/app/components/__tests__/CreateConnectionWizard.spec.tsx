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
const postgresqlConnectionTypeId = '550e8400-e29b-41d4-a716-446655440003';
const ociConnectionTypeId = '550e8400-e29b-41d4-a716-446655440005';
const unknownConnectionTypeId = '550e8400-e29b-41d4-a716-446655440009';

const connectionTypes = [
  {
    metadata: {
      id: postgresqlConnectionTypeId,
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
      id: ociConnectionTypeId,
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
        initialFormData={{ data_connection_type_id: postgresqlConnectionTypeId }}
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
        initialFormData={{ data_connection_type_id: postgresqlConnectionTypeId }}
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
          data_connection_type_id: postgresqlConnectionTypeId,
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
        initialFormData={{ data_connection_type_id: unknownConnectionTypeId }}
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
          data_connection_type_id: postgresqlConnectionTypeId,
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
          data_connection_type_id: postgresqlConnectionTypeId,
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
    expect(screen.getByText('URI value hidden')).toBeTruthy();
    expect(
      screen.getAllByText('••••••••').every((mask) => mask.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Show URI' }));
    expect(screen.getByText('postgres://example')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Create connection' }));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        {
          name: 'existing-connection',
          data_connection_type_id: postgresqlConnectionTypeId,
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

  it('uses a fixed mask and password input for sensitive credential fields', async () => {
    const user = userEvent.setup();
    mockUseConnectionTypes.mockReturnValue([
      [
        {
          ...connectionTypes[0],
          resource: {
            ...connectionTypes[0].resource,
            credentials_fields: [
              { name: 'API_TOKEN', label: 'API token', required: true, type: 'string' },
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
        initialFormData={{
          name: 'existing-connection',
          data_connection_type_id: postgresqlConnectionTypeId,
          credentials: {
            secret: 'existing-connection',
            properties: { API_TOKEN: 'short-lived-token' },
          },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    expect(screen.getByText('API token value hidden')).toBeTruthy();
    expect(
      screen.getAllByText('••••••••').every((mask) => mask.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
    expect(screen.queryByText('short-lived-token')).toBeNull();

    const reviewShowButton = screen.getByRole('button', { name: 'Show API token' });
    expect(within(reviewShowButton).getByTestId('hidden-value-icon')).toBeTruthy();

    await user.click(reviewShowButton);
    expect(screen.getByText('short-lived-token')).toBeTruthy();
    expect(within(reviewShowButton).getByTestId('visible-value-icon')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    const tokenInput = screen.getByTestId('credential-API_TOKEN') as HTMLInputElement;
    expect(tokenInput).toHaveProperty('type', 'password');
    expect(tokenInput.value).toBe('short-lived-token');

    const configurationShowButton = screen.getByRole('button', { name: 'Show API token' });
    expect(within(configurationShowButton).getByTestId('hidden-value-icon')).toBeTruthy();

    await user.click(configurationShowButton);
    expect(tokenInput).toHaveProperty('type', 'text');
    expect(within(configurationShowButton).getByTestId('visible-value-icon')).toBeTruthy();
  });

  it('keeps non-sensitive credential fields visible on both wizard steps', async () => {
    const user = userEvent.setup();
    const credentialValues = {
      API_TOKEN: 'short-lived-token',
      HOST: 'db.example',
      CA_CERT: 'ca-certificate-value',
      SSL_MODE: 'require',
    };
    mockUseConnectionTypes.mockReturnValue([
      [
        {
          ...connectionTypes[0],
          resource: {
            ...connectionTypes[0].resource,
            credentials_fields: [
              { name: 'API_TOKEN', label: 'API token', required: true, type: 'string' },
              { name: 'HOST', label: 'Host', required: true, type: 'string' },
              { name: 'CA_CERT', label: 'CA certificate', required: true, type: 'string' },
              { name: 'SSL_MODE', label: 'SSL mode', required: true, type: 'string' },
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
        initialFormData={{
          name: 'existing-connection',
          data_connection_type_id: postgresqlConnectionTypeId,
          credentials: {
            secret: 'existing-connection',
            properties: credentialValues,
          },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    expect(screen.queryByText(credentialValues.API_TOKEN)).toBeNull();
    expect(screen.getByText('API token value hidden')).toBeTruthy();
    expect(screen.getByText(credentialValues.HOST)).toBeTruthy();
    expect(screen.getByText(credentialValues.CA_CERT)).toBeTruthy();
    expect(screen.getByText(credentialValues.SSL_MODE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show API token' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show Host' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show CA certificate' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show SSL mode' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByTestId('credential-API_TOKEN') as HTMLInputElement).type).toBe('password');
    expect((screen.getByTestId('credential-HOST') as HTMLInputElement).type).toBe('text');
    expect((screen.getByTestId('credential-CA_CERT') as HTMLInputElement).type).toBe('text');
    expect((screen.getByTestId('credential-SSL_MODE') as HTMLInputElement).type).toBe('text');
  });

  it('masks camelCase and concatenated lowercase credential fields on both wizard steps', async () => {
    const user = userEvent.setup();
    const credentialValues = {
      clientSecret: 'client-secret-value',
      accessToken: 'access-token-value',
      dbpassword: 'database-password-value',
      clientsecret: 'client-secret-concatenated-value',
      accesstoken: 'access-token-concatenated-value',
      privatekey: 'private-key-concatenated-value',
    };
    mockUseConnectionTypes.mockReturnValue([
      [
        {
          ...connectionTypes[0],
          resource: {
            ...connectionTypes[0].resource,
            credentials_fields: [
              { name: 'clientSecret', label: 'clientSecret', required: true, type: 'string' },
              { name: 'accessToken', label: 'accessToken', required: true, type: 'string' },
              { name: 'dbpassword', label: 'dbpassword', required: true, type: 'string' },
              { name: 'clientsecret', label: 'clientsecret', required: true, type: 'string' },
              { name: 'accesstoken', label: 'accesstoken', required: true, type: 'string' },
              { name: 'privatekey', label: 'privatekey', required: true, type: 'string' },
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
        initialFormData={{
          name: 'existing-connection',
          data_connection_type_id: postgresqlConnectionTypeId,
          credentials: {
            secret: 'existing-connection',
            properties: credentialValues,
          },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    Object.values(credentialValues).forEach((value) => {
      expect(screen.queryByText(value)).toBeNull();
    });
    Object.keys(credentialValues).forEach((fieldName) => {
      expect(screen.getByText(`${fieldName} value hidden`)).toBeTruthy();
      expect(screen.getByRole('button', { name: `Show ${fieldName}` })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Back' }));
    Object.keys(credentialValues).forEach((fieldName) => {
      const input = screen.getByTestId(`credential-${fieldName}`) as HTMLInputElement;
      expect(input.type).toBe('password');
      expect(input.value).toBe(credentialValues[fieldName as keyof typeof credentialValues]);
    });
  });

  it('masks password aliases and plural secret names on both wizard steps', async () => {
    const user = userEvent.setup();
    const credentialValues = {
      PWD: 'password-alias-value',
      PASSWD: 'passwd-alias-value',
      DB_PWD: 'database-password-value',
      passwords: 'password-collection-value',
      secrets: 'secret-collection-value',
      tokens: 'token-collection-value',
    };
    mockUseConnectionTypes.mockReturnValue([
      [
        {
          ...connectionTypes[0],
          resource: {
            ...connectionTypes[0].resource,
            credentials_fields: Object.keys(credentialValues).map((fieldName) => ({
              name: fieldName,
              label: fieldName,
              required: true,
              type: 'string',
            })),
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
        initialFormData={{
          name: 'existing-connection',
          data_connection_type_id: postgresqlConnectionTypeId,
          credentials: {
            secret: 'existing-connection',
            properties: credentialValues,
          },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    Object.entries(credentialValues).forEach(([fieldName, value]) => {
      expect(screen.queryByText(value)).toBeNull();
      expect(screen.getByText(`${fieldName} value hidden`)).toBeTruthy();
      expect(screen.getByRole('button', { name: `Show ${fieldName}` })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Back' }));
    Object.entries(credentialValues).forEach(([fieldName, value]) => {
      const input = screen.getByTestId(`credential-${fieldName}`) as HTMLInputElement;
      expect(input.type).toBe('password');
      expect(input.value).toBe(value);
    });
  });

  it('masks connection URI and URL fields on both wizard steps', async () => {
    const user = userEvent.setup();
    const credentialValues = {
      URI: 'postgresql://alice:example-password@db.example:5432/app',
      url: 'postgresql://bob:example-password@db.example:5432/app',
      CONNECTION_STRING: 'postgresql://db.example/app?user=carol&password=example-password',
      DSN: 'host=db.example user=dave password=example-password',
    };
    mockUseConnectionTypes.mockReturnValue([
      [
        {
          ...connectionTypes[0],
          resource: {
            ...connectionTypes[0].resource,
            credentials_fields: [
              { name: 'URI', label: 'URI', required: true, type: 'string' },
              { name: 'url', label: 'Connection URL', required: true, type: 'string' },
              {
                name: 'CONNECTION_STRING',
                label: 'Connection string',
                required: true,
                type: 'string',
              },
              { name: 'DSN', label: 'Data source name', required: true, type: 'string' },
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
        initialFormData={{
          name: 'existing-connection',
          data_connection_type_id: postgresqlConnectionTypeId,
          credentials: {
            secret: 'existing-connection',
            properties: credentialValues,
          },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    Object.values(credentialValues).forEach((value) => {
      expect(screen.queryByText(value)).toBeNull();
    });
    ['URI', 'Connection URL', 'Connection string', 'Data source name'].forEach((label) => {
      expect(screen.getByText(`${label} value hidden`)).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Show URI' }));
    await user.click(screen.getByRole('button', { name: 'Show Connection URL' }));
    await user.click(screen.getByRole('button', { name: 'Show Connection string' }));
    await user.click(screen.getByRole('button', { name: 'Show Data source name' }));
    Object.values(credentialValues).forEach((value) => {
      expect(screen.getByText(value)).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Back' }));
    Object.entries(credentialValues).forEach(([fieldName, value]) => {
      const input = screen.getByTestId(`credential-${fieldName}`) as HTMLInputElement;
      expect(input).toHaveProperty('type', 'password');
      expect(input.value).toBe(value);
    });
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
        initialFormData={{ data_connection_type_id: postgresqlConnectionTypeId, name: 'warehouse' }}
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
      initialFormData: { data_connection_type_id: postgresqlConnectionTypeId },
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
        initialFormData={{ data_connection_type_id: postgresqlConnectionTypeId }}
      />,
    );
    rerender(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={onClose}
        initialFormData={{ data_connection_type_id: postgresqlConnectionTypeId }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Connection details' })).toBeTruthy();
    await user.type(screen.getByTestId('connection-name-input'), 'session-edit');

    rerender(
      <CreateConnectionWizard
        isOpen
        namespace="test-project"
        onClose={onClose}
        initialFormData={{ data_connection_type_id: ociConnectionTypeId, name: 'updated-prop' }}
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
          data_connection_type_id: postgresqlConnectionTypeId,
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
      within(screen.getByTestId(`${postgresqlConnectionTypeId}--ConnectionTypeCard`)).getByRole(
        'radio',
        {
          hidden: true,
        },
      ),
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
      within(screen.getByTestId(`${postgresqlConnectionTypeId}--ConnectionTypeCard`)).getByRole(
        'radio',
        {
          hidden: true,
        },
      ),
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
      within(screen.getByTestId(`${ociConnectionTypeId}--ConnectionTypeCard`)).getByRole('radio', {
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
      within(screen.getByTestId(`${postgresqlConnectionTypeId}--ConnectionTypeCard`)).getByRole(
        'radio',
        {
          hidden: true,
        },
      ),
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
