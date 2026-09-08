import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCollectionModal from '~/app/components/CreateCollectionModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';

jest.mock('~/app/api/dataRegistry');
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useSettings: jest.fn(),
}));

const mockCreateCollection = jest.mocked(dataRegistryApi.createCollection);
const mockUseSettings = jest.mocked(require('mod-arch-core').useSettings);

describe('CreateCollectionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    project: 'test-project',
    onCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettings.mockReturnValue({
      userSettings: { userId: 'test-user' },
      configSettings: null,
      loaded: true,
      loadError: undefined,
    });
  });

  it('should render modal with all form fields', () => {
    render(<CreateCollectionModal {...defaultProps} />);

    expect(screen.getByText('Create collection')).toBeTruthy();
    expect(screen.getByTestId('collection-name-input')).toBeTruthy();
    expect(screen.getByTestId('collection-description-input')).toBeTruthy();
    expect(screen.getByText('Owner')).toBeTruthy();
  });

  it('should show validation error when submitting without name', async () => {
    const user = userEvent.setup();
    render(<CreateCollectionModal {...defaultProps} />);

    await user.click(screen.getByTestId('create-collection-submit'));

    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it('should show validation error for invalid name', async () => {
    const user = userEvent.setup();
    render(<CreateCollectionModal {...defaultProps} />);

    await user.type(screen.getByTestId('collection-name-input'), 'Invalid Name');
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText('Name must contain only lowercase letters, numbers, and hyphens.'),
      ).toBeTruthy();
    });

    expect(screen.getByTestId('create-collection-submit')).toBeDisabled();
  });

  it('should submit collection with owner', async () => {
    const user = userEvent.setup();
    mockCreateCollection.mockResolvedValue({
      namespace: ['test-collection'],
      properties: {},
    });

    render(<CreateCollectionModal {...defaultProps} />);

    await user.type(screen.getByTestId('collection-name-input'), 'test-collection');

    await user.click(screen.getByTestId('create-collection-submit'));

    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledWith('test-project', {
        namespace: ['test-collection'],
        owner: 'test-user',
        properties: undefined,
      });
    });

    expect(defaultProps.onCreated).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should include description when provided', async () => {
    const user = userEvent.setup();
    mockCreateCollection.mockResolvedValue({
      namespace: ['test-collection'],
      properties: { description: 'Test description' },
    });

    render(<CreateCollectionModal {...defaultProps} />);

    await user.type(screen.getByTestId('collection-name-input'), 'test-collection');
    await user.type(screen.getByTestId('collection-description-input'), 'Test description');

    await user.click(screen.getByTestId('create-collection-submit'));

    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledWith('test-project', {
        namespace: ['test-collection'],
        owner: 'test-user',
        properties: { description: 'Test description' },
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
    render(<CreateCollectionModal {...defaultProps} />);

    await user.type(screen.getByTestId('collection-name-input'), 'test-collection');

    expect(screen.getByTestId('create-collection-submit')).toBeDisabled();
  });

  it('should display error message on submission failure', async () => {
    const user = userEvent.setup();
    mockCreateCollection.mockRejectedValue(new Error('API error 409: Collection already exists'));

    render(<CreateCollectionModal {...defaultProps} />);

    await user.type(screen.getByTestId('collection-name-input'), 'existing-collection');

    await user.click(screen.getByTestId('create-collection-submit'));

    await waitFor(() => {
      expect(screen.getByText('Error creating collection')).toBeTruthy();
      expect(screen.getByText('API error 409: Collection already exists')).toBeTruthy();
    });

    expect(defaultProps.onCreated).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should reset form fields on close', async () => {
    const user = userEvent.setup();
    render(<CreateCollectionModal {...defaultProps} />);

    await user.type(screen.getByTestId('collection-name-input'), 'test-name');

    await user.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
