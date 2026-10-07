import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ManageCollectionsModal from '~/app/components/ManageCollectionsModal';
import { useAssets } from '~/app/hooks/useAssets';
import { useCollections } from '~/app/hooks/useCollections';

jest.mock('~/app/hooks/useAssets', () => ({
  useAssets: jest.fn(),
}));
jest.mock('~/app/hooks/useCollections', () => ({
  useCollections: jest.fn(),
}));
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useSettings: jest.fn(),
}));

const mockUseAssets = jest.mocked(useAssets);
const mockUseCollections = jest.mocked(useCollections);
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

  it('replaces the manage modal with the create modal', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('create-collection-button'));

    expect(screen.queryByTestId('manage-collections-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('create-collection-modal')).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));

    expect(screen.getByTestId('manage-collections-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('create-collection-modal')).not.toBeInTheDocument();
  });

  it('replaces the manage modal with the delete modal', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ManageCollectionsModal {...defaultProps} />
      </MemoryRouter>,
    );

    await user.click(screen.getByTestId('collection-delete-default'));

    expect(screen.queryByTestId('manage-collections-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('delete-collection-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('modal-cancel-button'));

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
  });
});
