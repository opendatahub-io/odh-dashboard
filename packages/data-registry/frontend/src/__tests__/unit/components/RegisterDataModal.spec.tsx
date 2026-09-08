import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterDataModal from '~/app/components/RegisterDataModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';
import * as connectionsHook from '~/app/hooks/useConnections';

jest.mock('~/app/api/dataRegistry');
jest.mock('~/app/hooks/useConnections');
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useSettings: jest.fn(),
}));

const mockCreateVolume = jest.mocked(dataRegistryApi.createVolume);
const mockCreateGenericTable = jest.mocked(dataRegistryApi.createGenericTable);
const mockUseConnections = jest.mocked(connectionsHook.useConnections);
const mockUseSettings = jest.mocked(require('mod-arch-core').useSettings);

const mockConnections = [
  { name: 'my-s3-connection', displayName: 'My S3 Connection', connectionType: 's3' },
  { name: 'my-uri-connection', displayName: 'My URI Connection', connectionType: 'uri' },
];

describe('RegisterDataModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    project: 'test-project',
    collections: ['collection-1', 'collection-2'],
    onCreated: jest.fn(),
    onManageCollections: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnections.mockReturnValue([mockConnections, true, undefined]);
    mockUseSettings.mockReturnValue({
      userSettings: { userId: 'test-user' },
      configSettings: null,
      loaded: true,
      loadError: undefined,
    });
  });

  it('should render modal with all form fields', () => {
    render(<RegisterDataModal {...defaultProps} />);

    expect(screen.getByText('Register data')).toBeTruthy();
    expect(screen.getByTestId('data-name-input')).toBeTruthy();
    expect(screen.getByTestId('data-description-input')).toBeTruthy();
    expect(screen.getByTestId('asset-type-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-format-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-collection-toggle')).toBeTruthy();
    expect(screen.getByTestId('data-path-input')).toBeTruthy();
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

  it('should render owner field', () => {
    render(<RegisterDataModal {...defaultProps} />);

    expect(screen.getByText('Owner')).toBeTruthy();
  });

  it('should submit as volume when asset type is unstructured', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue({
      name: 'test-volume',
      'catalog-name': 'test-project',
      'schema-name': 'collection-1',
      'volume-type': 'other',
      'storage-location': '',
    });

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-volume');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-volume',
        // eslint-disable-next-line camelcase
        content_type: 'other',
        owner: 'test-user',
      });
    });

    expect(mockCreateGenericTable).not.toHaveBeenCalled();
    expect(defaultProps.onCreated).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should submit as generic table when asset type is structured', async () => {
    const user = userEvent.setup();
    /* eslint-disable camelcase */
    mockCreateGenericTable.mockResolvedValue({
      name: 'test-table',
      asset_type: 'table',
      format: 'iceberg',
      location: '',
      description: '',
      labels: [],
      collection: 'collection-1',
      connection_ref: null,
      owner: '',
      registered_by: '',
      created_at: '',
    });
    /* eslint-enable camelcase */

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
        owner: 'test-user',
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

  it('should display available connections in dropdown', async () => {
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-connection-toggle'));
    expect(screen.getByText('My S3 Connection')).toBeTruthy();
    expect(screen.getByText('My URI Connection')).toBeTruthy();
  });

  it('should show empty state when no connections available', async () => {
    mockUseConnections.mockReturnValue([[], true, undefined]);
    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.click(screen.getByTestId('data-connection-toggle'));
    expect(screen.getByText('No connections available')).toBeTruthy();
  });

  it('should include connection_ref when connection is selected for volume', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue({
      name: 'test-volume',
      'catalog-name': 'test-project',
      'schema-name': 'collection-1',
      'volume-type': 'other',
      'storage-location': '',
    });

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
        // eslint-disable-next-line camelcase
        content_type: 'other',
        // eslint-disable-next-line camelcase
        connection_ref: 'my-s3-connection',
        owner: 'test-user',
      });
    });
  });

  it('should include connection_ref when connection is selected for table', async () => {
    const user = userEvent.setup();
    /* eslint-disable camelcase */
    mockCreateGenericTable.mockResolvedValue({
      name: 'test-table',
      asset_type: 'table',
      format: 'iceberg',
      location: '',
      description: '',
      labels: [],
      collection: 'collection-1',
      connection_ref: { type: 'rhai', secret_name: 'my-s3-connection' },
      owner: '',
      registered_by: '',
      created_at: '',
    });
    /* eslint-enable camelcase */

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
        // eslint-disable-next-line camelcase
        connection_ref: 'my-s3-connection',
        owner: 'test-user',
      });
    });
  });

  it('should not include default path "/" in request', async () => {
    const user = userEvent.setup();
    mockCreateVolume.mockResolvedValue({
      name: 'minimal',
      'catalog-name': 'test-project',
      'schema-name': 'collection-1',
      'volume-type': 'other',
      'storage-location': '',
    });

    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'minimal');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'minimal',
        // eslint-disable-next-line camelcase
        content_type: 'other',
        owner: 'test-user',
      });
    });
  });

  it('should show validation error when submitting without owner', async () => {
    mockUseSettings.mockReturnValue({
      userSettings: { userId: '' },
      configSettings: null,
      loaded: true,
      loadError: undefined,
    });

    const user = userEvent.setup();
    render(<RegisterDataModal {...defaultProps} />);

    await user.type(screen.getByTestId('data-name-input'), 'test-asset');

    await user.click(screen.getByTestId('data-collection-toggle'));
    await user.click(screen.getByText('collection-1'));

    await user.click(screen.getByTestId('register-data-submit'));

    await waitFor(() => {
      expect(screen.getByText('Owner is required')).toBeTruthy();
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
  });
});
