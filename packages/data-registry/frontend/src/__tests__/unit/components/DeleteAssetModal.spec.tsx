import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAssetModal from '~/app/components/DeleteAssetModal';

describe('DeleteAssetModal', () => {
  const defaultProps = {
    assetName: 'my-table',
    onDelete: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the deletion confirmation copy', () => {
    render(<DeleteAssetModal {...defaultProps} />);
    expect(screen.getByText('Delete data asset?')).toBeTruthy();
    expect(screen.getByTestId('delete-asset-modal')).toHaveTextContent(
      'The my-table data asset will be deleted.',
    );
    expect(screen.getByTestId('delete-asset-modal')).toHaveTextContent(
      'Type my-table to confirm deletion:',
    );
    const confirmation = screen.getByRole('textbox', {
      name: 'Type my-table to confirm deletion:',
    });
    expect(confirmation).toHaveAttribute('id', 'delete-asset-confirmation');
    expect(confirmation).toHaveAttribute('required');
    expect(screen.getAllByText('my-table')).toHaveLength(2);
  });

  it('should require the exact asset name before deleting', async () => {
    render(<DeleteAssetModal {...defaultProps} />);
    const deleteButton = screen.getByTestId('delete-asset-confirm');
    const confirmation = screen.getByRole('textbox', {
      name: 'Type my-table to confirm deletion:',
    });

    expect(deleteButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: 'my' } });
    expect(deleteButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: 'my-table' } });
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onClose when cancel is clicked', () => {
    render(<DeleteAssetModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show error when delete fails', async () => {
    const onDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
    render(<DeleteAssetModal {...defaultProps} onDelete={onDelete} />);
    fireEvent.change(screen.getByTestId('delete-asset-confirmation'), {
      target: { value: 'my-table' },
    });
    fireEvent.click(screen.getByTestId('delete-asset-confirm'));
    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeTruthy();
    });
  });
});
