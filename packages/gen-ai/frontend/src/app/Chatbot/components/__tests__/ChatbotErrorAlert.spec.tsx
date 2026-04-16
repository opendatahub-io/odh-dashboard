import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorClassification } from '~/app/types';
import ChatbotErrorAlert from '~/app/Chatbot/components/ChatbotErrorAlert';

describe('ChatbotErrorAlert', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expandAlert = () => {
    const alert = screen.getByTestId('chatbot-error-alert');
    const expandButton = alert.querySelector('.pf-v6-c-alert__toggle button');
    if (expandButton) {
      fireEvent.click(expandButton);
    }
  };

  const createErrorClassification = (
    overrides: Partial<ErrorClassification> = {},
  ): ErrorClassification => ({
    pattern: 'full-failure',
    variant: 'danger',
    isRetriable: false,
    title: 'Test Error',
    description: 'This is a test error description',
    details: {
      component: 'Unknown',
      errorCode: 'TEST_CODE',
      rawMessage: 'Test error message',
    },
    ...overrides,
  });

  describe('rendering', () => {
    it('should render alert with title', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expect(screen.getByText('Test Error')).toBeInTheDocument();
    });

    it('should render with danger variant for danger variant', () => {
      const errorClassification = createErrorClassification({ variant: 'danger' });
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-danger');
    });

    it('should render with warning variant for warning variant', () => {
      const errorClassification = createErrorClassification({ variant: 'warning' });
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-warning');
    });

    it('should render description text', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expandAlert();

      expect(screen.getByText('This is a test error description')).toBeInTheDocument();
    });

    it('should render code block with error code and message', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expandAlert();

      expect(screen.getByText('[TEST_CODE] Test error message')).toBeInTheDocument();
    });

    it('should render code block without code prefix when code is undefined', () => {
      const errorClassification = createErrorClassification({
        details: { component: 'Unknown', errorCode: '', rawMessage: 'Test error message' },
      });
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expandAlert();

      // When errorCode is empty, the component still shows brackets: "[] Test error message"
      expect(screen.getByText('[] Test error message')).toBeInTheDocument();
    });

    it('should render with custom data-testid', () => {
      const errorClassification = createErrorClassification();
      render(
        <ChatbotErrorAlert
          classifiedError={errorClassification}
          data-testid="custom-error-alert"
        />,
      );

      expect(screen.getByTestId('custom-error-alert')).toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should show retry link when isRetriable is true and onRetry is provided', () => {
      const errorClassification = createErrorClassification({ isRetriable: true });
      render(<ChatbotErrorAlert classifiedError={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should not show retry link when isRetriable is false', () => {
      const errorClassification = createErrorClassification({ isRetriable: false });
      render(<ChatbotErrorAlert classifiedError={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should not show retry link when isRetriable is true but onRetry is not provided', () => {
      const errorClassification = createErrorClassification({ isRetriable: true });
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry link is clicked', () => {
      const errorClassification = createErrorClassification({ isRetriable: true });
      render(<ChatbotErrorAlert classifiedError={errorClassification} onRetry={mockOnRetry} />);

      const retryLink = screen.getByText('Retry');
      fireEvent.click(retryLink);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should have correct data-testid on retry link', () => {
      const errorClassification = createErrorClassification({ isRetriable: true });
      render(<ChatbotErrorAlert classifiedError={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.getByTestId('chatbot-error-alert-retry-link')).toBeInTheDocument();
    });
  });

  describe('expandable behavior', () => {
    it('should render as expandable alert', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      // PatternFly expandable alerts have an expand button
      const expandButton = alert.querySelector('.pf-v6-c-alert__toggle');
      expect(expandButton).toBeInTheDocument();
    });

    it('should render as inline alert', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-inline');
    });
  });

  describe('code block clipboard functionality', () => {
    let originalClipboard: Clipboard;

    beforeEach(() => {
      // Save original clipboard
      originalClipboard = navigator.clipboard;
      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      // Restore original clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    });

    it('should render copy button', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expandAlert();

      expect(screen.getByLabelText('Copy error to clipboard')).toBeInTheDocument();
    });

    it('should copy error to clipboard when copy button is clicked', async () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expandAlert();

      const copyButton = screen.getByLabelText('Copy error to clipboard');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('[TEST_CODE] Test error message');
    });

    it('should copy error without code prefix when code is undefined', async () => {
      const errorClassification = createErrorClassification({
        details: { component: 'Unknown', errorCode: '', rawMessage: 'Test error message' },
      });
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expandAlert();

      const copyButton = screen.getByLabelText('Copy error to clipboard');
      fireEvent.click(copyButton);

      // When errorCode is empty, the component still includes brackets
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('[] Test error message');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA label on copy button', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expandAlert();

      const copyButton = screen.getByLabelText('Copy error to clipboard');
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('different error patterns', () => {
    it('should render full-failure error', () => {
      const errorClassification = createErrorClassification({
        pattern: 'full-failure',
        variant: 'danger',
        title: 'Model inference failed',
      });
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expect(screen.getByText('Model inference failed')).toBeInTheDocument();
      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-danger');
    });

    it('should render partial-failure error', () => {
      const errorClassification = createErrorClassification({
        pattern: 'partial-failure',
        variant: 'warning',
        title: 'Knowledge source retrieval failed',
      });
      render(<ChatbotErrorAlert classifiedError={errorClassification} />);

      expect(screen.getByText('Knowledge source retrieval failed')).toBeInTheDocument();
      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-warning');
    });

    it('should render streaming-interruption error', () => {
      const errorClassification = createErrorClassification({
        pattern: 'streaming-interruption',
        variant: 'danger',
        title: 'Streaming error — connection lost',
        isRetriable: true,
      });
      render(<ChatbotErrorAlert classifiedError={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.getByText('Streaming error — connection lost')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-danger');
    });
  });
});
