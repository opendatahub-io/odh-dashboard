/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import UploadedFilesList from '~/app/Chatbot/components/UploadedFilesList';
import { FileModel } from '~/app/types';
import { DELETE_EVENT_NAME } from '~/app/Chatbot/hooks/useFileManagement';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('UploadedFilesList', () => {
  const mockFiles: FileModel[] = [
    {
      id: 'file-1',
      filename: 'document1.pdf',
      bytes: 1024000,
      created_at: 1609459200,
      purpose: 'assistants',
      object: 'file',
      status: 'completed',
      expires_at: 1612137600,
      status_details: '',
    },
    {
      id: 'file-2',
      filename: 'document2.txt',
      bytes: 512,
      created_at: 1609545600,
      purpose: 'assistants',
      object: 'file',
      status: 'completed',
      expires_at: 1612224000,
      status_details: '',
    },
  ];

  const defaultProps = {
    files: mockFiles,
    isLoading: false,
    isDeleting: false,
    error: null,
    onDeleteFile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<UploadedFilesList {...defaultProps} isLoading />);

    expect(screen.getByText('Uploaded files')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<UploadedFilesList {...defaultProps} error="Failed to load files" />);

    expect(screen.getByText('Uploaded files')).toBeInTheDocument();
    expect(screen.getByText('Error loading files')).toBeInTheDocument();
    expect(screen.getByText('Failed to load files')).toBeInTheDocument();
  });

  it('renders nothing when no files', () => {
    const { container } = render(<UploadedFilesList {...defaultProps} files={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders list of files with correct information', () => {
    render(<UploadedFilesList {...defaultProps} />);

    expect(screen.getByText('Uploaded files')).toBeInTheDocument();
    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('document2.txt')).toBeInTheDocument();
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getByText('512 Bytes')).toBeInTheDocument();
  });

  it('formats file dates correctly', () => {
    render(<UploadedFilesList {...defaultProps} />);

    expect(screen.getByText('01-01-2021')).toBeInTheDocument();
  });

  it('opens delete modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<UploadedFilesList {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    const modal = screen.getByTestId('delete-file-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('Delete file?')).toBeInTheDocument();
  });

  it('calls onDeleteFile when deletion is confirmed', async () => {
    const user = userEvent.setup();
    const mockOnDeleteFile = jest.fn();

    render(<UploadedFilesList {...defaultProps} onDeleteFile={mockOnDeleteFile} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    const confirmButton = screen.getByRole('button', { name: /^delete$/i });
    await user.click(confirmButton);

    expect(mockOnDeleteFile).toHaveBeenCalledWith('file-1');
  });

  it('closes modal and fires cancel event when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<UploadedFilesList {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByTestId('delete-file-modal')).not.toBeInTheDocument();
    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(DELETE_EVENT_NAME, {
      outcome: TrackingOutcome.cancel,
    });
  });

  it('disables delete buttons when deleting', () => {
    render(<UploadedFilesList {...defaultProps} isDeleting />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    deleteButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('formats different file sizes correctly', () => {
    const filesWithVariousSizes: FileModel[] = [
      { ...mockFiles[0], id: 'file-0', bytes: 0 },
      { ...mockFiles[0], id: 'file-kb', bytes: 2048 },
      { ...mockFiles[0], id: 'file-mb', bytes: 5242880 },
      { ...mockFiles[0], id: 'file-gb', bytes: 2147483648 },
    ];

    render(<UploadedFilesList {...defaultProps} files={filesWithVariousSizes} />);

    expect(screen.getByText('0 Bytes')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByText('5 MB')).toBeInTheDocument();
    expect(screen.getByText('2 GB')).toBeInTheDocument();
  });
});
