/* eslint-disable camelcase */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import ViewCodeModal from '~/app/components/run-results/ViewCodeModal';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import { AUTORAG_EVENTS } from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireMiscTrackingEventMock = jest.mocked(fireMiscTrackingEvent);

jest.mock('react-router', () => ({
  useParams: () => ({ namespace: 'test-ns' }),
}));

jest.mock('~/app/context/AutoragResultsContext', () => ({
  useAutoragResultsContext: () => ({
    parameters: {
      vector_db_secret_name: 'vector-db-secret',
      maas_secret_name: 'maas-secret',
    },
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
      ranking_options: { ranker: 'rrf', alpha: 0.5 },
    },
  ],
  tool_choice: { type: 'file_search' },
  include: ['file_search_call.results'],
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

  it('should render the modal and all four language tabs', () => {
    render(<ViewCodeModal {...defaultProps} />);

    expect(screen.getByTestId('playground-view-code-modal')).toBeInTheDocument();
    expect(screen.getByText('curl')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('should not render modal content when closed', () => {
    render(<ViewCodeModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('playground-view-code-modal')).not.toBeInTheDocument();
  });

  it('should generate snippets for the AutoRAG BFF with the configured secret parameters', () => {
    render(<ViewCodeModal {...defaultProps} />);

    expect(
      screen.getAllByText(/\/autorag\/api\/v1\/responses\?namespace=test-ns/),
    ).not.toHaveLength(0);
    expect(screen.getAllByText(/vectorDbSecretName=vector-db-secret/)).not.toHaveLength(0);
    expect(screen.getAllByText(/maasSecretName=maas-secret/)).not.toHaveLength(0);
    expect(screen.getAllByText(/DASHBOARD_TOKEN/)).not.toHaveLength(0);
  });

  it('should call onClose when the modal is closed', () => {
    render(<ViewCodeModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Close'));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should fire tracking when a snippet is copied', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ViewCodeModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Copy curl snippet'));

    await waitFor(() => {
      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.CODE_SNIPPETS_EXPORTED,
        { action: 'copied' },
      );
    });
  });
});
