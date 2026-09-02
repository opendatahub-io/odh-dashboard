import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterDataModal from '~/app/components/RegisterDataModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';

jest.mock('~/app/api/dataRegistry');

const mockCreateVolume = jest.mocked(dataRegistryApi.createVolume);
const mockCreateGenericTable = jest.mocked(dataRegistryApi.createGenericTable);

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
      });
    });
  });
});
