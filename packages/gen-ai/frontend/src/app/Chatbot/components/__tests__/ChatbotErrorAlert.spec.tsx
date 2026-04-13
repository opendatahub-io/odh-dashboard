import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorClassification } from '~/app/types';
import ChatbotErrorAlert from '~/app/Chatbot/components/ChatbotErrorAlert';

describe('ChatbotErrorAlert', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createErrorClassification = (
    overrides: Partial<ErrorClassification> = {},
  ): ErrorClassification => ({
    pattern: 'full_failure',
    severity: 'danger',
    retriable: false,
    title: 'Test Error',
    description: 'This is a test error description',
    rawError: {
      code: 'TEST_CODE',
      message: 'Test error message',
    },
    ...overrides,
  });

  describe('rendering', () => {
    it('should render alert with title', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Test Error')).toBeInTheDocument();
    });

    it('should render with danger variant for danger severity', () => {
      const errorClassification = createErrorClassification({ severity: 'danger' });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-danger');
    });

    it('should render with warning variant for warning severity', () => {
      const errorClassification = createErrorClassification({ severity: 'warning' });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-warning');
    });

    it('should render description text', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('This is a test error description')).toBeInTheDocument();
    });

    it('should render code block with error code and message', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('[TEST_CODE] Test error message')).toBeInTheDocument();
    });

    it('should render code block without code prefix when code is undefined', () => {
      const errorClassification = createErrorClassification({
        rawError: { message: 'Test error message' },
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.queryByText(/\[.*\]/)).not.toBeInTheDocument();
    });

    it('should render with custom data-testid', () => {
      const errorClassification = createErrorClassification();
      render(
        <ChatbotErrorAlert
          errorClassification={errorClassification}
          data-testid="custom-error-alert"
        />,
      );

      expect(screen.getByTestId('custom-error-alert')).toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should show retry link when retriable is true and onRetry is provided', () => {
      const errorClassification = createErrorClassification({ retriable: true });
      render(<ChatbotErrorAlert errorClassification={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should not show retry link when retriable is false', () => {
      const errorClassification = createErrorClassification({ retriable: false });
      render(<ChatbotErrorAlert errorClassification={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should not show retry link when retriable is true but onRetry is not provided', () => {
      const errorClassification = createErrorClassification({ retriable: true });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry link is clicked', () => {
      const errorClassification = createErrorClassification({ retriable: true });
      render(<ChatbotErrorAlert errorClassification={errorClassification} onRetry={mockOnRetry} />);

      const retryLink = screen.getByText('Retry');
      fireEvent.click(retryLink);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should have correct data-testid on retry link', () => {
      const errorClassification = createErrorClassification({ retriable: true });
      render(<ChatbotErrorAlert errorClassification={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.getByTestId('chatbot-error-alert-retry-link')).toBeInTheDocument();
    });
  });

  describe('template variable interpolation', () => {
    it('should interpolate template variables in title', () => {
      const errorClassification = createErrorClassification({
        title: 'Error with {modelName}',
        templateVars: { modelName: 'Llama 3.1 8B' },
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Error with Llama 3.1 8B')).toBeInTheDocument();
    });

    it('should interpolate template variables in description', () => {
      const errorClassification = createErrorClassification({
        description: 'The model {modelName} supports up to {maxTokens} tokens.',
        templateVars: { modelName: 'Llama 3.1 8B', maxTokens: 4096 },
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(
        screen.getByText('The model Llama 3.1 8B supports up to 4096 tokens.'),
      ).toBeInTheDocument();
    });

    it('should handle multiple occurrences of the same variable', () => {
      const errorClassification = createErrorClassification({
        title: '{modelName} error with {modelName}',
        templateVars: { modelName: 'Llama 3.1 8B' },
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Llama 3.1 8B error with Llama 3.1 8B')).toBeInTheDocument();
    });

    it('should not interpolate when templateVars is undefined', () => {
      const errorClassification = createErrorClassification({
        title: 'Error with {modelName}',
        templateVars: undefined,
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Error with {modelName}')).toBeInTheDocument();
    });

    it('should handle numeric template variables', () => {
      const errorClassification = createErrorClassification({
        description: 'Maximum tokens: {maxTokens}',
        templateVars: { maxTokens: 4096 },
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Maximum tokens: 4096')).toBeInTheDocument();
    });
  });

  describe('expandable behavior', () => {
    it('should render as expandable alert', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      // PatternFly expandable alerts have an expand button
      const expandButton = alert.querySelector('.pf-v6-c-alert__toggle');
      expect(expandButton).toBeInTheDocument();
    });

    it('should render as inline alert', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-inline');
    });
  });

  describe('code block clipboard functionality', () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('should render copy button', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('should copy error to clipboard when copy button is clicked', async () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('[TEST_CODE] Test error message');
    });

    it('should copy error without code prefix when code is undefined', async () => {
      const errorClassification = createErrorClassification({
        rawError: { message: 'Test error message' },
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test error message');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA label on copy button', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const copyButton = screen.getByLabelText('Copy error to clipboard');
      expect(copyButton).toBeInTheDocument();
    });

    it('should have proper ID linking code content to copy button', () => {
      const errorClassification = createErrorClassification();
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      const codeContent = screen.getByTestId('chatbot-error-alert-code-content');
      expect(codeContent).toHaveAttribute('id', 'chatbot-error-alert-code-content');
    });
  });

  describe('different error patterns', () => {
    it('should render full_failure error', () => {
      const errorClassification = createErrorClassification({
        pattern: 'full_failure',
        severity: 'danger',
        title: 'Model inference failed',
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Model inference failed')).toBeInTheDocument();
      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-danger');
    });

    it('should render partial_failure error', () => {
      const errorClassification = createErrorClassification({
        pattern: 'partial_failure',
        severity: 'warning',
        title: 'Knowledge source retrieval failed',
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} />);

      expect(screen.getByText('Knowledge source retrieval failed')).toBeInTheDocument();
      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-warning');
    });

    it('should render streaming_interruption error', () => {
      const errorClassification = createErrorClassification({
        pattern: 'streaming_interruption',
        severity: 'danger',
        title: 'Streaming error — connection lost',
        retriable: true,
      });
      render(<ChatbotErrorAlert errorClassification={errorClassification} onRetry={mockOnRetry} />);

      expect(screen.getByText('Streaming error — connection lost')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      const alert = screen.getByTestId('chatbot-error-alert');
      expect(alert).toHaveClass('pf-m-danger');
    });
  });
});
