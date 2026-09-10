import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAssetModal from '~/app/components/DeleteAssetModal';

describe('DeleteAssetModal', () => {
  const defaultProps = {
    assetName: 'my-table',
    assetType: 'table' as const,
    onDelete: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render asset name and type', () => {
    render(<DeleteAssetModal {...defaultProps} />);
    expect(screen.getByText('Permanently delete "my-table" structured asset?')).toBeTruthy();
    expect(screen.getAllByText('my-table')).toHaveLength(2);
  });

  it('should render volume type', () => {
    render(<DeleteAssetModal {...defaultProps} assetType="volume" />);
    expect(screen.getByText('Permanently delete "my-table" unstructured asset?')).toBeTruthy();
  });

  it('should require the exact asset name before deleting', async () => {
    render(<DeleteAssetModal {...defaultProps} />);
    const deleteButton = screen.getByTestId('delete-asset-confirm');
    const confirmation = screen.getByTestId('delete-asset-confirmation');

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
