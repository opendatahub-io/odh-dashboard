import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ManageCollectionsModal from '~/app/components/ManageCollectionsModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';
import { useAssets } from '~/app/hooks/useAssets';
import { useCollections } from '~/app/hooks/useCollections';

jest.mock('~/app/hooks/useAssets', () => ({
  useAssets: jest.fn(),
}));
jest.mock('~/app/hooks/useCollections', () => ({
  useCollections: jest.fn(),
}));
jest.mock('~/app/api/dataRegistry', () => ({
  ...jest.requireActual('~/app/api/dataRegistry'),
  createCollection: jest.fn(),
}));
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useSettings: jest.fn(),
}));

const mockUseAssets = jest.mocked(useAssets);
const mockUseCollections = jest.mocked(useCollections);
const mockCreateCollection = jest.mocked(dataRegistryApi.createCollection);
const mockUseSettings = jest.mocked(require('mod-arch-core').useSettings);

describe('ManageCollectionsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    project: 'test-project',
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAssets.mockReturnValue([[], true, undefined, jest.fn(), ['default']]);
    mockUseCollections.mockReturnValue([
      [
        {
          name: 'default',
          description: '',
          assetNames: [],
          tableCount: 0,
          volumeCount: 0,
        },
        {
          name: 'with-assets',
          description: '',
          assetNames: ['asset-1'],
          tableCount: 1,
          volumeCount: 0,
        },
      ],
      true,
      undefined,
      jest.fn(),
    ]);
    mockUseSettings.mockReturnValue({
      userSettings: { userId: 'test-user' },
      configSettings: null,
      loaded: true,
      loadError: undefined,
    });
  });

  it('shows an inline collection row instead of opening a create modal', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('create-collection-button'));

    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();
    expect(screen.getByTestId('create-collection-row')).toBeInTheDocument();
    expect(screen.getByTestId('new-collection-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-collection-description-input')).toBeInTheDocument();

    await user.click(screen.getByTestId('cancel-create-collection'));

    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('create-collection-row')).not.toBeInTheDocument();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('cancels inline creation with Escape without closing the management dialog', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('create-collection-button'));
    await user.keyboard('{Escape}');

    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('create-collection-row')).not.toBeInTheDocument();
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('create-collection-button'));
    await user.click(screen.getByTestId('new-collection-description-input'));
    await user.keyboard('{Escape}');

    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('create-collection-row')).not.toBeInTheDocument();
  });

  it('creates a collection from the inline row', async () => {
    const user = userEvent.setup();
    mockCreateCollection.mockResolvedValue({
      namespace: ['new-collection'],
      properties: {},
    });
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('create-collection-button'));
    await user.type(screen.getByTestId('new-collection-name-input'), 'new-collection');
    await user.type(screen.getByTestId('new-collection-description-input'), 'A new collection');
    await user.click(screen.getByTestId('confirm-create-collection'));

    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledWith('test-project', {
        namespace: ['new-collection'],
        properties: {
          description: 'A new collection',
          owner: 'test-user',
          created_at: expect.any(String), // eslint-disable-line camelcase
          created_by: 'test-user', // eslint-disable-line camelcase
        },
      });
    });
    expect(screen.queryByTestId('create-collection-row')).not.toBeInTheDocument();
    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('shows validation feedback for an invalid inline collection name', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('create-collection-button'));
    await user.type(screen.getByTestId('new-collection-name-input'), 'Invalid Name');

    expect(
      screen.getByText('Name must contain only lowercase letters, numbers, and hyphens.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('confirm-create-collection')).toBeDisabled();
  });

  it('shows a warning when the creator identity is unavailable', async () => {
    mockUseSettings.mockReturnValue({
      userSettings: { userId: '' },
      configSettings: null,
      loaded: true,
      loadError: undefined,
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('create-collection-button'));

    expect(screen.getByTestId('collection-identity-unavailable')).toHaveTextContent(
      'Refresh the page and try again before creating a collection.',
    );
    expect(screen.getByTestId('confirm-create-collection')).toBeDisabled();
  });

  it('keeps collection creation conflicts separate from refresh handling', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    mockCreateCollection.mockRejectedValue(new Error('API error 409: Collection already exists'));
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} onRefresh={onRefresh} />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('create-collection-button'));
    await user.type(screen.getByTestId('new-collection-name-input'), 'existing-collection');
    await user.click(screen.getByTestId('confirm-create-collection'));

    await waitFor(() => {
      expect(screen.getByTestId('manage-collections-action-error')).toHaveTextContent(
        'Collection "existing-collection" already exists.',
      );
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('keeps creation errors separate from refresh errors', async () => {
    const user = userEvent.setup();
    const refreshError = new Error('List refresh failed');
    const collectionsRefresh = jest.fn().mockRejectedValue(refreshError);
    mockUseAssets.mockReturnValue([[], true, undefined, jest.fn(), ['default']]);
    mockUseCollections.mockReturnValue([
      [
        {
          name: 'default',
          description: '',
          assetNames: [],
          tableCount: 0,
          volumeCount: 0,
        },
      ],
      true,
      undefined,
      collectionsRefresh,
    ]);
    mockCreateCollection.mockResolvedValue({
      namespace: ['new-collection'],
      properties: {},
    });

    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('create-collection-button'));
    await user.type(screen.getByTestId('new-collection-name-input'), 'new-collection');
    await user.click(screen.getByTestId('confirm-create-collection'));

    await waitFor(() => {
      expect(screen.getByTestId('manage-collections-action-error')).toHaveTextContent(
        'Collection created, but the collection list could not be refreshed: List refresh failed',
      );
    });
    expect(mockCreateCollection).toHaveBeenCalled();
  });

  it('disables deletion for the default collection', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    const deleteButton = screen.getByTestId('collection-delete-default');
    expect(deleteButton).toBeDisabled();
    await user.hover(deleteButton);

    expect(
      await screen.findByText('The default collection cannot be deleted.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('delete-collection-modal')).not.toBeInTheDocument();
  });

  it('disables deletion for collections with assets', () => {
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('collection-delete-with-assets')).toBeDisabled();
    expect(
      screen.getByText('Remove all associated assets to delete a collection.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('collection-filter')).toHaveClass(
      'odh-data-registry-manage-collections__search',
    );
  });
});
