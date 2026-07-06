/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteFileModal from '~/app/Chatbot/components/DeleteFileModal';
import { FileModel } from '~/app/types';

describe('DeleteFileModal', () => {
  const mockFile: FileModel = {
    id: 'file-123',
    filename: 'test-document.pdf',
    bytes: 1024,
    created_at: 1609459200,
    purpose: 'assistants',
    object: 'file',
    status: 'completed',
    expires_at: 1612137600,
    status_details: '',
  };

  const defaultProps = {
    isOpen: true,
    file: mockFile,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when file is null', () => {
    const { container } = render(<DeleteFileModal {...defaultProps} file={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with file information', () => {
    render(<DeleteFileModal {...defaultProps} />);

    expect(screen.getByText('Delete file?')).toBeInTheDocument();
    expect(screen.getByText(/test-document.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/file will be deleted/i)).toBeInTheDocument();
  });

  it('calls onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = jest.fn();

    render(<DeleteFileModal {...defaultProps} onConfirm={mockOnConfirm} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    render(<DeleteFileModal {...defaultProps} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when deleting', () => {
    render(<DeleteFileModal {...defaultProps} isDeleting />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('does not render when isOpen is false', () => {
    render(<DeleteFileModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Delete file?')).not.toBeInTheDocument();
  });
});
