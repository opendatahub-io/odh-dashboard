/* eslint-disable camelcase */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewCodeModal from '~/app/components/run-results/ViewCodeModal';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';

const mockNotification = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  remove: jest.fn(),
};
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => mockNotification,
}));

const mockTemplate: ResponsesTemplate = {
  model: 'vllm/llama-3',
  stream: false,
  store: true,
  input: [
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: '<user_query_placeholder>' }],
    },
  ],
  metadata: { autorag_run_id: '123', rag_pattern_name: 'test_pattern' },
  instructions: 'Answer from file_search results.',
  tools: [
    {
      type: 'file_search',
      vector_store_ids: ['vs-1'],
      max_num_results: 5,
      ranking_options: {
        search_mode: 'hybrid',
        ranker_strategy: 'rrf',
        ranker_k: 60,
        ranker_alpha: 0.5,
      },
    },
  ],
  tool_choice: { type: 'file_search' },
  include: ['file_search_call.results'],
};

const mockOgxCredentials = {
  baseUrl: btoa('https://ogx.example.com'),
  apiKey: btoa('sk-test-key-123'),
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  patternName: 'test_pattern',
  responsesTemplate: mockTemplate,
};

describe('ViewCodeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when open', () => {
    render(<ViewCodeModal {...defaultProps} />);
    expect(screen.getByTestId('playground-view-code-modal')).toBeInTheDocument();
  });

  it('should not render modal content when closed', () => {
    render(<ViewCodeModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('playground-view-code-modal')).not.toBeInTheDocument();
  });

  it('should display the formatted pattern name in the title', () => {
    render(<ViewCodeModal {...defaultProps} />);
    const modal = screen.getByTestId('playground-view-code-modal');
    expect(modal).toHaveTextContent(/test_pattern.*Response payload/);
  });

  it('should display the description text', () => {
    render(<ViewCodeModal {...defaultProps} />);
    expect(
      screen.getByText(/Use these code snippets to query this pattern programmatically/),
    ).toBeInTheDocument();
  });

  it('should render all four language tabs', () => {
    render(<ViewCodeModal {...defaultProps} />);
    expect(screen.getByTestId('view-code-tabs')).toBeInTheDocument();
    expect(screen.getByText('curl')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('should show curl tab content by default', () => {
    render(<ViewCodeModal {...defaultProps} />);
    expect(screen.getByText(/curl -X POST/)).toBeInTheDocument();
  });

  it('should switch to Node.js tab when clicked', () => {
    render(<ViewCodeModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Node.js'));
    expect(screen.getByLabelText('Copy Node.js snippet')).toBeInTheDocument();
  });

  it('should switch to Go tab when clicked', () => {
    render(<ViewCodeModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Go'));
    expect(screen.getByLabelText('Copy Go snippet')).toBeInTheDocument();
  });

  it('should switch to Python tab when clicked', () => {
    render(<ViewCodeModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Python'));
    expect(screen.getByLabelText('Copy Python snippet')).toBeInTheDocument();
  });

  it('should render copy buttons for each tab', () => {
    render(<ViewCodeModal {...defaultProps} />);
    expect(screen.getByLabelText('Copy curl snippet')).toBeInTheDocument();
  });

  it('should call onClose when modal is closed', () => {
    render(<ViewCodeModal {...defaultProps} />);
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  describe('with credentials', () => {
    const propsWithCredentials = {
      ...defaultProps,
      ogxCredentials: mockOgxCredentials,
    };

    it('should render the show credentials toggle button', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      expect(screen.getByTestId('toggle-credentials-button')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-credentials-button')).toHaveTextContent('Show credentials');
    });

    it('should not render the toggle button when credentials are not provided', () => {
      render(<ViewCodeModal {...defaultProps} />);
      expect(screen.queryByTestId('toggle-credentials-button')).not.toBeInTheDocument();
    });

    it('should show placeholders by default when credentials are available', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      const codeBlock = screen.getByText(/curl -X POST/);
      expect(codeBlock.textContent).toContain('<HOSTNAME>');
      expect(codeBlock.textContent).toContain('<API_KEY>');
    });

    it('should inject credentials when show credentials is toggled', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      fireEvent.click(screen.getByTestId('toggle-credentials-button'));
      expect(screen.getByTestId('toggle-credentials-button')).toHaveTextContent('Hide credentials');
      const codeBlock = screen.getByText(/curl -X POST/);
      expect(codeBlock.textContent).toContain('ogx.example.com');
      expect(codeBlock.textContent).not.toContain('<HOSTNAME>');
    });

    it('should display "Copy with credentials" button text when credentials are provided', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      const copyButton = screen.getByLabelText('Copy curl snippet');
      expect(copyButton).toBeInTheDocument();
    });

    it('should display copy button when no credentials', () => {
      render(<ViewCodeModal {...defaultProps} />);
      const copyButton = screen.getByLabelText('Copy curl snippet');
      expect(copyButton).toBeInTheDocument();
    });

    it('should show replacement instruction text when no credentials', () => {
      render(<ViewCodeModal {...defaultProps} />);
      expect(screen.getByText(/Replace/)).toBeInTheDocument();
    });

    it('should not show replacement instruction text when credentials are available', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      expect(screen.queryByText(/Replace/)).not.toBeInTheDocument();
    });

    it('should show error notification and fall back to placeholders when credentials have invalid base64', () => {
      const invalidCredentials = {
        baseUrl: '%%%invalid-base64%%%',
        apiKey: btoa('sk-test-key-123'),
      };
      render(<ViewCodeModal {...defaultProps} ogxCredentials={invalidCredentials} />);

      expect(mockNotification.error).toHaveBeenCalledWith(
        'Failed to decode credentials',
        expect.any(String),
      );
      expect(screen.queryByTestId('toggle-credentials-button')).not.toBeInTheDocument();
      const codeBlock = screen.getByText(/curl -X POST/);
      expect(codeBlock.textContent).toContain('<HOSTNAME>');
    });
  });
});
