/* eslint-disable camelcase */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterDataModal from '~/app/components/RegisterDataModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';
import * as connectionsHook from '~/app/hooks/useConnections';
import { mockDchConnection, mockRhaiConnection } from '~/__mocks__/mockConnection';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';

jest.mock('~/app/api/dataRegistry');
jest.mock('~/app/hooks/useConnections');

const mockCreateVolume = jest.mocked(dataRegistryApi.createVolume);
const mockCreateGenericTable = jest.mocked(dataRegistryApi.createGenericTable);
const mockUseConnections = jest.mocked(connectionsHook.useConnections);

const mockConnections = [
  mockRhaiConnection(),
  mockRhaiConnection({
    secret_name: 'my-uri-connection',
    name: 'My URI Connection',
    connectionType: 'uri',
  }),
];
const mockRefreshConnections = jest.fn();

describe('RegisterDataModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    project: 'test-project',
    collections: ['collection-1', 'collection-2'],
    onCreated: jest.fn(),
    onManageCollections: jest.fn(),
    onManageLabels: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshConnections.mockResolvedValue(mockConnections);
    mockUseConnections.mockReturnValue([
      mockConnections,
      true,
      undefined,
      mockRefreshConnections,
      [],
    ]);
  });

  it('should render modal with all form fields', () => {
    render(<RegisterDataModal {...defaultProps} />);

    expect(screen.getByText('Create data asset')).toBeTruthy();
    expect(screen.getByTestId('data-name-input')).toBeTruthy();
    expect(screen.getByTestId('data-description-input')).toBeTruthy();
    expect(screen.getByTestId('asset-type-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-format-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-collection-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-path-input')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Asset type info' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PII information' })).toBeInTheDocument();
  });

  it('should default to Unstructured asset type', () => {
    render(<RegisterDataModal {...defaultProps} />);

    const assetTypeToggle = screen.getByTestId('asset-type-toggle');
    expect(assetTypeToggle.textContent).toBe('Unstructured');
    expect(assetTypeToggle.className).not.toContain('pf-m-disabled');
  });

  it('should not show schema section for unstructured type', () => {
    render(<RegisterDataModal {...defaultProps} />);

    expect(screen.queryByText('Schema')).toBeNull();
    expect(screen.queryByTestId('add-schema-column')).toBeNull();
  });

  it('should show schema section when switching to structured type', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    expect(screen.getByText('Schema')).toBeTruthy();
    expect(screen.getByTestId('add-schema-column')).toBeTruthy();
  });

  it('should switch format options when changing asset type', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    const formatToggle = screen.getByTestId('data-format-toggle');
    await user.click(formatToggle);
    expect(screen.getByText('Documents')).toBeTruthy();
    expect(screen.queryByText('Apache Iceberg')).toBeNull();
    await user.click(screen.getByText('Documents'));

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    expect(screen.getByTestId('data-format-toggle').textContent).toBe('Apache Iceberg');
    expect(screen.queryByText('Documents')).toBeNull();
  });

  it('should show validation error when submitting without name', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(screen.getByText('Asset name is required')).toBeTruthy();
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
  });

  it('should show validation error when submitting without collection', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-asset');
    await user.tab();

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(screen.getByText('Collection is required')).toBeTruthy();
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
  });

  it('should submit as volume when asset type is unstructured', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue(mockVolumeInfo({ name: 'test-volume' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-volume');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-volume',
        format: 'other',
      });
    });

    expect(mockCreateGenericTable).not.toHaveBeenCalled();
    expect(defaultProps.onCreated).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should submit as generic table when asset type is structured', async () => {
    const user = userEvent.setup();
    mockCreateGenericTable.mockResolvedValue(mockAssetResponse({ name: 'test-table' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    await user.type(screen.getByTestId('data-name-input'), 'test-table');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateGenericTable).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-table',
        format: 'iceberg',
      });
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
    expect(defaultProps.onCreated).toHaveBeenCalled();
  });

  it('should display error message on submission failure', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockRejectedValue(new Error('API error 409: Asset already exists'));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'existing-asset');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(screen.getByText('Error registering data asset')).toBeTruthy();
      expect(screen.getByText('API error 409: Asset already exists')).toBeTruthy();
    });

    expect(defaultProps.onCreated).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should reset form fields on close', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-name');

    await user.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show "Create new collection" in collection dropdown', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-collection-toggle'));
    expect(screen.getByText('Create new collection')).toBeTruthy();
  });

  it('should open project label management from the organization section', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Manage labels' }));

    expect(defaultProps.onManageLabels).toHaveBeenCalled();
  });

  it('should disable project label management when no callback is provided', () => {
    render(<RegisterDataModal {...defaultProps} onManageLabels={undefined} />);

    expect(screen.getByRole('button', { name: 'Manage labels' })).toBeDisabled();
  });

  it('should preserve form values while the modal is temporarily hidden', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'asset-under-construction');

    rerender(<RegisterDataModal {...defaultProps} isOpen={false} />);
    rerender(<RegisterDataModal {...defaultProps} isOpen />);

    expect(screen.getByTestId('data-name-input')).toHaveValue('asset-under-construction');
  });

  it('should keep added labels as editable rows with remove controls', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-add-label-button'));
    const labelInput = screen.getByTestId('data-labels-input-0');
    await user.type(labelInput, 'production');

    expect(labelInput).toHaveValue('production');
    expect(screen.getByTestId('data-label-remove-0')).toBeInTheDocument();

    await user.click(screen.getByTestId('data-label-remove-0'));
    expect(screen.queryByTestId('data-labels-input-0')).not.toBeInTheDocument();
  });

  it('should use a minus control for custom property rows', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-add-custom-property'));

    expect(screen.getByTestId('data-custom-property-remove-0')).toBeInTheDocument();
  });

  it('should display available connections in dropdown', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-connection-toggle'));
    expect(screen.getByText('My S3 Connection')).toBeTruthy();
    expect(screen.getByText('My URI Connection')).toBeTruthy();
  });

  it('should keep RHOAI display metadata out of the selectable connections', async () => {
    const user = userEvent.setup();
    const dchConnection = mockDchConnection();
    const rhaiDisplayConnection = mockRhaiConnection({
      secret_name: 'legacy-rhai-connection',
      name: 'Legacy RHOAI connection',
    });
    mockUseConnections.mockReturnValue([
      [dchConnection],
      true,
      undefined,
      mockRefreshConnections,
      [],
      [dchConnection, rhaiDisplayConnection],
    ]);

    render(<RegisterDataModal {...defaultProps} />);
    await user.click(screen.getByTestId('data-connection-toggle'));

    expect(screen.getByTestId(`connection-option-dch:${dchConnection.id}`)).toBeInTheDocument();
    expect(screen.queryByText('Legacy RHOAI connection')).not.toBeInTheDocument();
  });

  it('should include connection_ref when connection is selected for volume', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue(mockVolumeInfo({ name: 'test-volume' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-volume');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(screen.getByText('My S3 Connection'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-volume',
        format: 'other',
        connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
      });
    });
  });

  it('should include connection_ref when connection is selected for table', async () => {
    const user = userEvent.setup();
    mockCreateGenericTable.mockResolvedValue(mockAssetResponse({ name: 'test-table' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('asset-type-toggle'));
    await user.click(screen.getByText('Structured'));

    await user.type(screen.getByTestId('data-name-input'), 'test-table');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(screen.getByText('My S3 Connection'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateGenericTable).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-table',
        format: 'iceberg',
        connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
      });
    });
  });

  it.each(['volume', 'table'] as const)(
    'should confirm and save a selected DCH reference for a %s',
    async (kind) => {
      const user = userEvent.setup();
      const first = mockDchConnection();
      const selected = mockDchConnection({ id: '550e8400-e29b-41d4-a716-446655440002' });
      mockUseConnections.mockReturnValue([
        [first, selected],
        true,
        undefined,
        mockRefreshConnections,
        [],
      ]);
      mockRefreshConnections.mockResolvedValue([first, { ...selected, name: 'Renamed data' }]);
      mockCreateVolume.mockResolvedValue(mockVolumeInfo({ name: 'dch-asset' }));
      mockCreateGenericTable.mockResolvedValue(mockAssetResponse({ name: 'dch-asset' }));

      render(<RegisterDataModal {...defaultProps} />);
      await user.type(screen.getByTestId('data-name-input'), 'dch-asset');
      await user.click(screen.getByTestId('data-collection-toggle'));
      await user.click(screen.getByText('collection-1'));
      if (kind === 'table') {
        await user.click(screen.getByTestId('asset-type-toggle'));
        await user.click(screen.getByText('Structured'));
      }
      await user.click(screen.getByTestId('data-connection-toggle'));
      await user.click(
        within(screen.getByTestId(`connection-option-dch:${selected.id}`)).getByRole('option'),
      );
      await user.click(screen.getByTestId('register-data-submit'));

      const create = kind === 'table' ? mockCreateGenericTable : mockCreateVolume;
      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(create.mock.calls[0][2].connection_ref).toEqual({ type: 'dch', id: selected.id });
      expect(mockRefreshConnections).toHaveBeenCalledTimes(1);
    },
  );

  it('should prevent creation if the selected connection cannot be confirmed', async () => {
    const user = userEvent.setup();
    mockRefreshConnections.mockResolvedValue([]);
    render(<RegisterDataModal {...defaultProps} />);
    await user.type(screen.getByTestId('data-name-input'), 'stale-asset');
    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));
    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(screen.getByText('My S3 Connection'));
    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() =>
      expect(screen.getByText(/selected connection could not be confirmed/i)).toBeInTheDocument(),
    );
    expect(mockCreateVolume).not.toHaveBeenCalled();
    expect(mockCreateGenericTable).not.toHaveBeenCalled();
  });

  it('should not include default path "/" in request', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue(mockVolumeInfo({ name: 'minimal' }));

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'minimal');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'minimal',
        format: 'other',
      });
    });
  });
});
