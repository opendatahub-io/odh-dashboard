import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SourceDeleteSuccessAlert from '~/app/Chatbot/components/alerts/SourceDeleteSuccessAlert';
import SourceUploadErrorAlert from '~/app/Chatbot/components/alerts/SourceUploadErrorAlert';
import SourceUploadSuccessAlert from '~/app/Chatbot/components/alerts/SourceUploadSuccessAlert';

describe('Alert Components', () => {
  describe('SourceDeleteSuccessAlert', () => {
    const defaultProps = {
      isVisible: true,
      alertKey: 1,
      onClose: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders when visible', () => {
      render(<SourceDeleteSuccessAlert {...defaultProps} />);

      expect(screen.getByText('Source deleted')).toBeInTheDocument();
      expect(
        screen.getByText('The source has been successfully deleted from your vector store.'),
      ).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<SourceDeleteSuccessAlert {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Source deleted')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(<SourceDeleteSuccessAlert {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('SourceUploadErrorAlert', () => {
    const defaultProps = {
      isVisible: true,
      alertKey: 1,
      onClose: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders with default title and message', () => {
      render(<SourceUploadErrorAlert {...defaultProps} />);

      expect(screen.getByText('Upload Error')).toBeInTheDocument();
      expect(screen.getByText('Please try again.')).toBeInTheDocument();
    });

    it('renders with custom title and error message', () => {
      render(
        <SourceUploadErrorAlert
          {...defaultProps}
          title="Custom Error"
          errorMessage="File too large"
        />,
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('File too large')).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<SourceUploadErrorAlert {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Upload Error')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(<SourceUploadErrorAlert {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('SourceUploadSuccessAlert', () => {
    const defaultProps = {
      isVisible: true,
      alertKey: 1,
      onClose: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders when visible', () => {
      render(<SourceUploadSuccessAlert {...defaultProps} />);

      expect(screen.getByText('Source uploaded')).toBeInTheDocument();
      expect(screen.getByText(/This source must be chunked and embedded/i)).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<SourceUploadSuccessAlert {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Source uploaded')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(<SourceUploadSuccessAlert {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
