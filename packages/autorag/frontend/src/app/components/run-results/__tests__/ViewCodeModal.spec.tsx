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

jest.mock('react-router', () => ({
  useParams: () => ({ namespace: 'test-ns' }),
}));

jest.mock('~/app/context/AutoragResultsContext', () => ({
  useAutoragResultsContext: () => ({
    parameters: { ogx_secret_name: 'test-secret' },
    patterns: {},
  }),
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

    it('should render the inject credentials toggle', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      expect(screen.getByTestId('toggle-credentials-button')).toBeInTheDocument();
      expect(screen.getByText('Inject credentials')).toBeInTheDocument();
    });

    it('should not render the toggle button when credentials are not provided', () => {
      render(<ViewCodeModal {...defaultProps} />);
      expect(screen.queryByTestId('toggle-credentials-button')).not.toBeInTheDocument();
    });

    it('should show k8s credential setup by default when credentials are available but toggle is off', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      const [codeBlock] = screen.getAllByText(/OGX_CLIENT_BASE_URL/);
      expect(codeBlock.textContent).toContain('oc get secret');
      expect(codeBlock.textContent).not.toContain('ogx.example.com');
    });

    it('should inject credentials when the toggle is switched on', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      fireEvent.click(screen.getByTestId('toggle-credentials-button'));
      const codeBlock = screen.getByText(/curl -X POST/);
      expect(codeBlock.textContent).toContain('ogx.example.com');
      expect(codeBlock.textContent).not.toContain('<HOSTNAME>');
    });

    it('should show "Copy" copy button when credentials are available but toggle is off', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      expect(screen.getByLabelText('Copy curl snippet')).toBeInTheDocument();
    });

    it('should update copy button aria-label to include "with credentials" when toggle is on', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      fireEvent.click(screen.getByTestId('toggle-credentials-button'));
      expect(screen.getByLabelText('Copy curl snippet with credentials')).toBeInTheDocument();
    });

    it('should display copy button when no credentials', () => {
      render(<ViewCodeModal {...defaultProps} />);
      expect(screen.getByLabelText('Copy curl snippet')).toBeInTheDocument();
    });

    it('should explain credentials are fetched from cluster when no credentials', () => {
      render(<ViewCodeModal {...defaultProps} />);
      expect(
        screen.getByText(/fetches your Open GenAI Stack credentials from the cluster/),
      ).toBeInTheDocument();
    });

    it('should not show the cluster fetch description when credentials are available', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      expect(
        screen.queryByText(/fetches your Open GenAI Stack credentials from the cluster/),
      ).not.toBeInTheDocument();
    });

    it('should copy snippet with placeholders when toggle is off', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<ViewCodeModal {...propsWithCredentials} />);
      fireEvent.click(screen.getByLabelText('Copy curl snippet'));

      expect(writeText).toHaveBeenCalledTimes(1);
      const copiedText = writeText.mock.calls[0][0] as string;
      expect(copiedText).toContain('oc get secret');
      expect(copiedText).not.toContain('ogx.example.com');
    });

    it('should copy snippet with real credentials when toggle is on', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<ViewCodeModal {...propsWithCredentials} />);
      fireEvent.click(screen.getByTestId('toggle-credentials-button'));
      fireEvent.click(screen.getByLabelText('Copy curl snippet with credentials'));

      expect(writeText).toHaveBeenCalledTimes(1);
      const copiedText = writeText.mock.calls[0][0] as string;
      expect(copiedText).toContain('ogx.example.com');
      expect(copiedText).toContain('sk-test-key-123');
      expect(copiedText).not.toContain('<HOSTNAME>');
      expect(copiedText).not.toContain('<API_KEY>');
    });

    it('should not show the credentials warning alert when toggle is off', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      const alert = screen.getByTestId('credentials-warning-alert');
      expect(alert.closest('[aria-hidden="true"]')).toBeInTheDocument();
    });

    it('should show the credentials warning alert when toggle is on', () => {
      render(<ViewCodeModal {...propsWithCredentials} />);
      fireEvent.click(screen.getByTestId('toggle-credentials-button'));
      expect(screen.getByTestId('credentials-warning-alert')).toBeInTheDocument();
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
      const [codeBlock] = screen.getAllByText(/OGX_CLIENT_BASE_URL/);
      expect(codeBlock.textContent).toContain('oc get secret');
    });
  });
});
