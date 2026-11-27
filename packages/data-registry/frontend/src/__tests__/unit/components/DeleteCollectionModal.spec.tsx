import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteCollectionModal from '~/app/components/DeleteCollectionModal';
import { deleteCollectionWithAssets } from '~/app/utilities/deleteCollectionWithAssets';
import type { CollectionInfo } from '~/app/hooks/useCollections';

jest.mock('~/app/utilities/deleteCollectionWithAssets', () => ({
  deleteCollectionWithAssets: jest.fn(),
}));

const mockDeleteCollectionWithAssets = jest.mocked(deleteCollectionWithAssets);

describe('DeleteCollectionModal', () => {
  const emptyCollection: CollectionInfo = {
    name: 'empty-collection',
    description: 'Empty',
    assetNames: [],
    assets: [],
    tableCount: 0,
    volumeCount: 0,
  };
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    project: 'test-project',
    collection: emptyCollection,
    onDeleted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows deleting an empty collection without confirmation text', async () => {
    const user = userEvent.setup();
    mockDeleteCollectionWithAssets.mockResolvedValue(undefined);
    render(<DeleteCollectionModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Delete collection\?/ })).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            'The empty-collection collection will be deleted. It contains no data assets.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('confirm-delete-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-delete-button')).toBeEnabled();

    await user.click(screen.getByTestId('confirm-delete-button'));

    await waitFor(() => {
      expect(mockDeleteCollectionWithAssets).toHaveBeenCalledWith(
        'test-project',
        'empty-collection',
        [],
      );
      expect(defaultProps.onDeleted).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('warns and deletes registry records before the collection', async () => {
    const user = userEvent.setup();
    mockDeleteCollectionWithAssets.mockResolvedValue(undefined);
    render(
      <DeleteCollectionModal
        {...defaultProps}
        collection={{
          ...emptyCollection,
          name: 'analytics',
          assetNames: ['asset-1'],
          assets: [{ name: 'asset-1', assetType: 'table' }],
          tableCount: 1,
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /Delete collection and assets\?/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('This deletes registry records')).toBeInTheDocument();
    expect(screen.getByText('asset-1')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-delete-button')).toBeEnabled();

    await user.click(screen.getByTestId('confirm-delete-button'));

    await waitFor(() => {
      expect(mockDeleteCollectionWithAssets).toHaveBeenCalledWith('test-project', 'analytics', [
        { name: 'asset-1', assetType: 'table' },
      ]);
    });
  });

  it('does not delete when the asset list does not match the counts', async () => {
    const user = userEvent.setup();
    render(
      <DeleteCollectionModal
        {...defaultProps}
        collection={{
          ...emptyCollection,
          assetNames: ['asset-1'],
          assets: [],
          tableCount: 1,
        }}
      />,
    );

    await user.click(screen.getByTestId('confirm-delete-button'));

    expect(mockDeleteCollectionWithAssets).not.toHaveBeenCalled();
    expect(screen.getByText(/Nothing was deleted/)).toBeInTheDocument();
  });
});
