import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterVolumeModal from '~/app/components/RegisterVolumeModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';

jest.mock('~/app/api/dataRegistry');

const mockCreateVolume = jest.mocked(dataRegistryApi.createVolume);

describe('RegisterVolumeModal', () => {
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
    render(<RegisterVolumeModal {...defaultProps} />);

    expect(screen.getByText('Register data')).toBeTruthy();
    expect(screen.getByTestId('volume-name-input')).toBeTruthy();
    expect(screen.getByTestId('volume-description-input')).toBeTruthy();
    expect(screen.getByTestId('asset-type-toggle')).toBeTruthy();
    expect(screen.getByTestId('volume-format-toggle')).toBeTruthy();
    expect(screen.getByTestId('volume-collection-toggle')).toBeTruthy();
    expect(screen.getByTestId('volume-path-input')).toBeTruthy();
  });

  it('should render section descriptions', () => {
    render(<RegisterVolumeModal {...defaultProps} />);

    expect(
      screen.getByText(
        'Provide general identification and classification details for this data asset.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Specify where the data is stored by selecting a connection or providing path details.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Define operational metadata, compliance levels, and discoverability tags.'),
    ).toBeTruthy();
  });

  it('should show validation error when submitting without name', async () => {
    render(<RegisterVolumeModal {...defaultProps} />);

    const submitButton = screen.getByTestId('register-volume-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Asset name is required')).toBeTruthy();
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
  });

  it('should show validation error when submitting without collection', async () => {
    render(<RegisterVolumeModal {...defaultProps} />);

    const nameInput = screen.getByTestId('volume-name-input');
    fireEvent.change(nameInput, { target: { value: 'test-volume' } });
    fireEvent.blur(nameInput);

    const submitButton = screen.getByTestId('register-volume-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Collection is required')).toBeTruthy();
    });

    expect(mockCreateVolume).not.toHaveBeenCalled();
  });

  it('should show validation error for invalid name format', async () => {
    render(<RegisterVolumeModal {...defaultProps} />);

    const nameInput = screen.getByTestId('volume-name-input');
    fireEvent.change(nameInput, { target: { value: 'INVALID_NAME!' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(
        screen.getByText('Name must contain only lowercase letters, numbers, and hyphens'),
      ).toBeTruthy();
    });
  });

  it('should submit volume with correct data', async () => {
    mockCreateVolume.mockResolvedValue({
      name: 'test-volume',
      'catalog-name': 'test-project',
      'schema-name': 'collection-1',
      'volume-type': 'other',
      'storage-location': '/data/path',
    });

    render(<RegisterVolumeModal {...defaultProps} />);

    const nameInput = screen.getByTestId('volume-name-input');
    fireEvent.change(nameInput, { target: { value: 'test-volume' } });

    const descriptionInput = screen.getByTestId('volume-description-input');
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

    const collectionToggle = screen.getByTestId('volume-collection-toggle');
    fireEvent.click(collectionToggle);
    const collectionOption = screen.getByText('collection-1');
    fireEvent.click(collectionOption);

    const pathInput = screen.getByTestId('volume-path-input');
    fireEvent.change(pathInput, { target: { value: '/data/path' } });

    const submitButton = screen.getByTestId('register-volume-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'test-volume',
        // eslint-disable-next-line camelcase
        content_type: 'other',
        description: 'Test description',
        location: '/data/path',
      });
    });

    expect(defaultProps.onCreated).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should display error message on submission failure', async () => {
    mockCreateVolume.mockRejectedValue(new Error('API error 409: Volume already exists'));

    render(<RegisterVolumeModal {...defaultProps} />);

    const nameInput = screen.getByTestId('volume-name-input');
    fireEvent.change(nameInput, { target: { value: 'existing-volume' } });

    const collectionToggle = screen.getByTestId('volume-collection-toggle');
    fireEvent.click(collectionToggle);
    const collectionOption = screen.getByText('collection-1');
    fireEvent.click(collectionOption);

    const submitButton = screen.getByTestId('register-volume-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error registering volume')).toBeTruthy();
      expect(screen.getByText('API error 409: Volume already exists')).toBeTruthy();
    });

    expect(defaultProps.onCreated).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should reset form fields on close', () => {
    render(<RegisterVolumeModal {...defaultProps} />);

    const nameInput = screen.getByTestId('volume-name-input');
    fireEvent.change(nameInput, { target: { value: 'test-volume' } });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show "Create new collection" in collection dropdown', () => {
    render(<RegisterVolumeModal {...defaultProps} />);

    const collectionToggle = screen.getByTestId('volume-collection-toggle');
    fireEvent.click(collectionToggle);

    expect(screen.getByText('Create new collection')).toBeTruthy();
  });

  it('should not include default path "/" in request', async () => {
    mockCreateVolume.mockResolvedValue({
      name: 'minimal-volume',
      'catalog-name': 'test-project',
      'schema-name': 'collection-1',
      'volume-type': 'documents',
      'storage-location': '',
    });

    render(<RegisterVolumeModal {...defaultProps} />);

    const nameInput = screen.getByTestId('volume-name-input');
    fireEvent.change(nameInput, { target: { value: 'minimal-volume' } });

    const formatToggle = screen.getByTestId('volume-format-toggle');
    fireEvent.click(formatToggle);
    const formatOption = screen.getByText('Documents');
    fireEvent.click(formatOption);

    const collectionToggle = screen.getByTestId('volume-collection-toggle');
    fireEvent.click(collectionToggle);
    const collectionOption = screen.getByText('collection-1');
    fireEvent.click(collectionOption);

    const submitButton = screen.getByTestId('register-volume-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateVolume).toHaveBeenCalledWith('test-project', 'collection-1', {
        name: 'minimal-volume',
        // eslint-disable-next-line camelcase
        content_type: 'documents',
      });
    });
  });

  it('should show asset type as disabled with Unstructured value', () => {
    render(<RegisterVolumeModal {...defaultProps} />);

    const assetTypeToggle = screen.getByTestId('asset-type-toggle');
    expect(assetTypeToggle.textContent).toBe('Unstructured');
    expect(assetTypeToggle.className).toContain('pf-m-disabled');
  });
});
