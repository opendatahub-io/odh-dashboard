/* eslint-disable camelcase */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewCodeModal from '~/app/components/run-results/ViewCodeModal';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import {
  AutoragResultsContext,
  type AutoragResultsContextProps,
} from '~/app/context/AutoragResultsContext';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({ namespace: 'test-namespace' }),
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

const mockContextValue: AutoragResultsContextProps = {
  patterns: {},
  parameters: { ogx_secret_name: 'my-ogx-secret' },
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  patternName: 'test_pattern',
  responsesTemplate: mockTemplate,
};

const renderWithContext = (props = defaultProps) =>
  render(
    <AutoragResultsContext.Provider value={mockContextValue}>
      <ViewCodeModal {...props} />
    </AutoragResultsContext.Provider>,
  );

describe('ViewCodeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when open', () => {
    renderWithContext();
    expect(screen.getByTestId('playground-view-code-modal')).toBeInTheDocument();
  });

  it('should not render modal content when closed', () => {
    renderWithContext({ ...defaultProps, isOpen: false });
    expect(screen.queryByTestId('playground-view-code-modal')).not.toBeInTheDocument();
  });

  it('should display the formatted pattern name in the title', () => {
    renderWithContext();
    const modal = screen.getByTestId('playground-view-code-modal');
    expect(modal).toHaveTextContent(/test_pattern.*Response payload/);
  });

  it('should display the description text', () => {
    renderWithContext();
    expect(
      screen.getByText(/Use these code snippets to query this pattern programmatically/),
    ).toBeInTheDocument();
  });

  it('should display the secret name and namespace', () => {
    renderWithContext();
    expect(screen.getByText('my-ogx-secret')).toBeInTheDocument();
    expect(screen.getByText('test-namespace')).toBeInTheDocument();
  });

  it('should render all four language tabs', () => {
    renderWithContext();
    expect(screen.getByTestId('view-code-tabs')).toBeInTheDocument();
    expect(screen.getByText('curl')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('should show curl tab content by default', () => {
    renderWithContext();
    expect(screen.getByText(/curl -X POST/)).toBeInTheDocument();
  });

  it('should switch to Go tab when clicked', () => {
    renderWithContext();
    fireEvent.click(screen.getByText('Go'));
    expect(screen.getByLabelText('Copy Go snippet')).toBeInTheDocument();
  });

  it('should switch to Node.js tab when clicked', () => {
    renderWithContext();
    fireEvent.click(screen.getByText('Node.js'));
    expect(screen.getByLabelText('Copy Node.js snippet')).toBeInTheDocument();
  });

  it('should switch to Python tab when clicked', () => {
    renderWithContext();
    fireEvent.click(screen.getByText('Python'));
    expect(screen.getByLabelText('Copy Python snippet')).toBeInTheDocument();
  });

  it('should render copy buttons for each tab', () => {
    renderWithContext();
    expect(screen.getByLabelText('Copy curl snippet')).toBeInTheDocument();
  });

  it('should call onClose when modal is closed', () => {
    renderWithContext();
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
