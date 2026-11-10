import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteCollectionModal from '~/app/components/DeleteCollectionModal';
import { deleteCollection } from '~/app/api/dataRegistry';
import type { CollectionInfo } from '~/app/hooks/useCollections';

jest.mock('~/app/api/dataRegistry', () => ({
  ...jest.requireActual('~/app/api/dataRegistry'),
  deleteCollection: jest.fn(),
}));

const mockDeleteCollection = jest.mocked(deleteCollection);

describe('DeleteCollectionModal', () => {
  const emptyCollection: CollectionInfo = {
    name: 'empty-collection',
    description: 'Empty',
    assetNames: [],
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
    mockDeleteCollection.mockResolvedValue(undefined);
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
      expect(mockDeleteCollection).toHaveBeenCalledWith('test-project', 'empty-collection');
      expect(defaultProps.onDeleted).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('blocks deleting a collection that contains assets', () => {
    render(
      <DeleteCollectionModal
        {...defaultProps}
        collection={{
          ...emptyCollection,
          assetNames: ['asset-1'],
          tableCount: 1,
        }}
      />,
    );

    expect(screen.getByText('Collection is not empty')).toBeInTheDocument();
    expect(screen.getByText('asset-1')).toBeInTheDocument();
    expect(screen.queryByTestId('confirm-delete-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
  });
});
