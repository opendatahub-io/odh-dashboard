/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import type { AutoRAGEvaluationResult, AutoragPattern } from '~/app/types/autoragPattern';
import PatternDetailsModal from '~/app/components/run-results/PatternDetailsModal/PatternDetailsModal';

const mockUsePatternEvaluationResults = jest.fn();
jest.mock('~/app/hooks/usePatternEvaluationResults', () => ({
  usePatternEvaluationResults: (...args: unknown[]) => mockUsePatternEvaluationResults(...args),
}));

const mockPattern: AutoragPattern = {
  name: 'pattern0',
  iteration: 0,
  max_combinations: 20,
  duration_seconds: 120,
  settings: {
    vector_store: { datasource_type: 'milvus', collection_name: 'collection0' },
    chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
    embedding: {
      model_id: 'mock-embed-a',
      distance_metric: 'cosine',
      embedding_params: {
        embedding_dimension: 768,
        context_length: 512,
        timeout: null,
        model_type: null,
        provider_id: null,
        provider_resource_id: null,
      },
    },
    retrieval: { method: 'window', number_of_chunks: 5 },
    generation: {
      model_id: 'granite-3.1-8b-instruct',
      context_template_text: '{document}',
      user_message_text: '',
      system_message_text: '',
    },
  },
  scores: {
    answer_correctness: { mean: 0.65, ci_low: 0.4, ci_high: 0.8 },
    faithfulness: { mean: 0.42, ci_low: 0.2, ci_high: 0.6 },
    context_correctness: { mean: 0.91, ci_low: 0.85, ci_high: 0.95 },
  },
  final_score: 0.66,
};

const mockEvaluationResults: AutoRAGEvaluationResult[] = [
  {
    question: 'What models are available?',
    correct_answers: ['Model A is available.', 'Model B is also available.'],
    question_id: 'q0',
    answer: 'Several models are available.',
    answer_contexts: [{ text: 'Models include A and B.', document_id: 'doc0' }],
    scores: { answer_correctness: 0.75, faithfulness: 0.5, context_correctness: 0.9 },
  },
  {
    question: 'How does RAG work?',
    correct_answers: ['RAG retrieves documents and generates answers.'],
    question_id: 'q1',
    answer: 'RAG uses retrieval and generation.',
    answer_contexts: [{ text: 'RAG is a pattern.', document_id: 'doc1' }],
    scores: { answer_correctness: 0.6, faithfulness: 0.8, context_correctness: 0.7 },
  },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  patterns: [mockPattern],
  selectedIndex: 0,
  rank: 1,
  onPatternChange: jest.fn(),
};

describe('PatternDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePatternEvaluationResults.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('should render the modal with the header', () => {
    render(<PatternDetailsModal {...defaultProps} />);
    expect(screen.getByTestId('pattern-details-modal')).toBeInTheDocument();
    expect(screen.getByTestId('pattern-details-header')).toBeInTheDocument();
    expect(screen.getByText('Pattern details')).toBeInTheDocument();
  });

  it('should not render modal content when isOpen is false', () => {
    render(<PatternDetailsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('pattern-details-header')).not.toBeInTheDocument();
  });

  it('should display rank in the header', () => {
    render(<PatternDetailsModal {...defaultProps} rank={3} />);
    expect(screen.getByTestId('pattern-rank')).toHaveTextContent('3');
  });

  it('should display final score in the header', () => {
    render(<PatternDetailsModal {...defaultProps} />);
    expect(screen.getByTestId('pattern-final-score')).toHaveTextContent('0.660');
  });

  it('should show plain text when only one pattern exists', () => {
    render(<PatternDetailsModal {...defaultProps} />);
    expect(screen.queryByTestId('pattern-selector-dropdown')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^pattern\s+0$/ })).toBeInTheDocument();
  });

  it('should display all settings tabs plus Pattern information', () => {
    render(<PatternDetailsModal {...defaultProps} />);

    expect(screen.getByTestId('tab-pattern_information')).toBeInTheDocument();
    expect(screen.getByTestId('tab-vector_store')).toBeInTheDocument();
    expect(screen.getByTestId('tab-chunking')).toBeInTheDocument();
    expect(screen.getByTestId('tab-embedding')).toBeInTheDocument();
    expect(screen.getByTestId('tab-retrieval')).toBeInTheDocument();
    expect(screen.getByTestId('tab-generation')).toBeInTheDocument();
  });

  it('should not display Sample Q&A tab when evaluationResults are not provided', () => {
    render(<PatternDetailsModal {...defaultProps} />);
    expect(screen.queryByText('Sample Q&A')).not.toBeInTheDocument();
  });

  it('should display Sample Q&A tab when evaluationResults are available', () => {
    mockUsePatternEvaluationResults.mockReturnValue({
      data: mockEvaluationResults,
      isLoading: false,
      isError: false,
    });
    render(<PatternDetailsModal {...defaultProps} />);
    expect(screen.getByTestId('tab-sample_qa')).toBeInTheDocument();
  });

  describe('Pattern information tab (default)', () => {
    it('should show top-level fields', () => {
      render(<PatternDetailsModal {...defaultProps} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getAllByText('pattern 0').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Iteration')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Max Combinations')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Duration Seconds')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('Final Score')).toBeInTheDocument();
      expect(screen.getByText('0.66')).toBeInTheDocument();
    });

    it('should show score type radio buttons with Mean selected by default', () => {
      render(<PatternDetailsModal {...defaultProps} />);

      const meanRadio = screen.getByTestId('score-type-mean');
      const ciHighRadio = screen.getByTestId('score-type-ci_high');
      const ciLowRadio = screen.getByTestId('score-type-ci_low');

      expect(meanRadio).toBeChecked();
      expect(ciHighRadio).not.toBeChecked();
      expect(ciLowRadio).not.toBeChecked();
    });

    it('should show score values for mean by default', () => {
      render(<PatternDetailsModal {...defaultProps} />);

      expect(screen.getByText('0.650')).toBeInTheDocument();
      expect(screen.getByText('0.420')).toBeInTheDocument();
      expect(screen.getByText('0.910')).toBeInTheDocument();
    });

    it('should switch to CI High scores when radio is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByLabelText('CI High'));

      expect(screen.getByTestId('score-type-ci_high')).toBeChecked();
      expect(screen.getByText('0.800')).toBeInTheDocument();
      expect(screen.getByText('0.600')).toBeInTheDocument();
      expect(screen.getByText('0.950')).toBeInTheDocument();
    });

    it('should switch to CI Low scores when radio is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByLabelText('CI Low'));

      expect(screen.getByTestId('score-type-ci_low')).toBeChecked();
      expect(screen.getByText('0.400')).toBeInTheDocument();
      expect(screen.getByText('0.200')).toBeInTheDocument();
      expect(screen.getByText('0.850')).toBeInTheDocument();
    });

    it('should display score metric names with score type label', () => {
      render(<PatternDetailsModal {...defaultProps} />);

      expect(screen.getByText('Answer Correctness (Mean)')).toBeInTheDocument();
      expect(screen.getByText('Faithfulness (Mean)')).toBeInTheDocument();
      expect(screen.getByText('Context Correctness (Mean)')).toBeInTheDocument();
    });
  });

  describe('Settings tabs', () => {
    it('should show chunking settings when Chunking tab is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-chunking'));

      expect(screen.getByText('Method')).toBeInTheDocument();
      expect(screen.getByText('recursive')).toBeInTheDocument();
      expect(screen.getByText('Chunk Size')).toBeInTheDocument();
      expect(screen.getByText('256')).toBeInTheDocument();
      expect(screen.getByText('Chunk Overlap')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();
    });

    it('should show vector store settings when Vector Store tab is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-vector_store'));

      expect(screen.getByText('Datasource Type')).toBeInTheDocument();
      expect(screen.getByText('milvus')).toBeInTheDocument();
      expect(screen.getByText('Collection Name')).toBeInTheDocument();
      expect(screen.getByText('collection0')).toBeInTheDocument();
    });

    it('should show generation settings when Generation tab is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-generation'));

      expect(screen.getByText('Model Id')).toBeInTheDocument();
      expect(screen.getByText('granite-3.1-8b-instruct')).toBeInTheDocument();
    });
  });

  describe('Sample Q&A tab', () => {
    beforeEach(() => {
      mockUsePatternEvaluationResults.mockReturnValue({
        data: mockEvaluationResults,
        isLoading: false,
        isError: false,
      });
    });

    it('should display evaluation results when Sample Q&A tab is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-sample_qa'));

      expect(screen.getByText('What models are available?')).toBeInTheDocument();
      expect(screen.getByText('Several models are available.')).toBeInTheDocument();
      expect(screen.getByText('How does RAG work?')).toBeInTheDocument();
      expect(screen.getByText('RAG uses retrieval and generation.')).toBeInTheDocument();
    });

    it('should display Q&A entries with testids', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-sample_qa'));

      expect(screen.getByTestId('qa-entry-q0')).toBeInTheDocument();
      expect(screen.getByTestId('qa-entry-q1')).toBeInTheDocument();
    });

    it('should show expected answer count in expandable toggle', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-sample_qa'));

      expect(screen.getByTestId('qa-expected-answers-q0')).toBeInTheDocument();
      expect(screen.getByTestId('qa-expected-answers-q1')).toBeInTheDocument();
    });

    it('should expand expected answers when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-sample_qa'));
      await user.click(screen.getByText('View expected answer (2)'));

      expect(screen.getByText('Model A is available.')).toBeVisible();
      expect(screen.getByText('Model B is also available.')).toBeVisible();
      expect(screen.getByText('Expected answer 2')).toBeVisible();
    });

    it('should collapse expected answers when toggle is clicked again', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} />);

      await user.click(screen.getByTestId('tab-sample_qa'));
      await user.click(screen.getByText('View expected answer (2)'));

      expect(screen.getByText('Model A is available.')).toBeVisible();

      await user.click(screen.getByText('View expected answer (2)'));

      expect(screen.getByText('Model A is available.')).not.toBeVisible();
    });

    it('should show loading state while evaluation results are loading', () => {
      mockUsePatternEvaluationResults.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      render(<PatternDetailsModal {...defaultProps} />);
      expect(screen.getByTestId('tab-sample_qa')).toBeInTheDocument();
    });
  });

  describe('Tab reset behavior', () => {
    it('should preserve active tab when switching patterns', async () => {
      const user = userEvent.setup();
      const secondPattern: AutoragPattern = {
        ...mockPattern,
        name: 'pattern1',
        iteration: 1,
      };

      const props = {
        ...defaultProps,
        patterns: [mockPattern, secondPattern],
      };

      const { rerender } = render(<PatternDetailsModal {...props} />);

      await user.click(screen.getByTestId('tab-chunking'));

      rerender(<PatternDetailsModal {...props} selectedIndex={1} />);

      expect(screen.getByRole('tab', { name: 'Chunking', selected: true })).toBeInTheDocument();
    });

    it('should reset to Pattern information tab when modal reopens', () => {
      const { rerender } = render(<PatternDetailsModal {...defaultProps} />);

      rerender(<PatternDetailsModal {...defaultProps} isOpen={false} />);
      rerender(<PatternDetailsModal {...defaultProps} isOpen />);

      expect(
        screen.getByRole('tab', { name: 'Pattern information', selected: true }),
      ).toBeInTheDocument();
    });

    it('should reset score type to Mean when modal reopens', () => {
      const { rerender } = render(<PatternDetailsModal {...defaultProps} />);

      rerender(<PatternDetailsModal {...defaultProps} isOpen={false} />);
      rerender(<PatternDetailsModal {...defaultProps} isOpen />);

      expect(screen.getByTestId('score-type-mean')).toBeChecked();
    });
  });

  describe('pattern dropdown', () => {
    const secondPattern: AutoragPattern = {
      ...mockPattern,
      name: 'pattern1',
      iteration: 1,
    };
    const twoPatternProps = {
      ...defaultProps,
      patterns: [mockPattern, secondPattern],
    };

    it('should display the current pattern name in the dropdown toggle', () => {
      render(<PatternDetailsModal {...twoPatternProps} />);
      const toggle = screen.getByTestId('pattern-selector-dropdown');
      expect(toggle).toHaveTextContent('pattern 0');
    });

    it('should call onPatternChange when a different pattern is selected', async () => {
      const user = userEvent.setup();
      const onPatternChange = jest.fn();
      render(<PatternDetailsModal {...twoPatternProps} onPatternChange={onPatternChange} />);

      await user.click(screen.getByTestId('pattern-selector-dropdown'));
      await user.click(screen.getByText('pattern 1'));

      expect(onPatternChange).toHaveBeenCalledWith(1);
    });
  });

  describe('onClose callback', () => {
    it('should call onClose when the modal close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<PatternDetailsModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('download button', () => {
    it('should render a Download button', () => {
      render(<PatternDetailsModal {...defaultProps} />);
      expect(screen.getByTestId('pattern-details-download')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    it('should trigger window.print when Download is clicked', async () => {
      const user = userEvent.setup();
      const printSpy = jest.spyOn(window, 'print').mockImplementation(jest.fn());
      try {
        render(<PatternDetailsModal {...defaultProps} />);
        await user.click(screen.getByTestId('pattern-details-download'));
        expect(printSpy).toHaveBeenCalledTimes(1);
      } finally {
        printSpy.mockRestore();
      }
    });

    it('should render print-only container with all sections when printing', async () => {
      const user = userEvent.setup();
      const printSpy = jest.spyOn(window, 'print').mockImplementation(jest.fn());
      try {
        render(<PatternDetailsModal {...defaultProps} />);
        await user.click(screen.getByTestId('pattern-details-download'));

        // Print container should be portalled to document.body
        const printContainer = screen.getByTestId('print-container');
        expect(printContainer.parentElement).toBe(document.body);
        expect(printContainer).toHaveTextContent('pattern 0');
        expect(printContainer).toHaveTextContent('Pattern information');
        expect(printContainer).toHaveTextContent('Chunking');
        expect(printContainer).toHaveTextContent('Embedding');
      } finally {
        printSpy.mockRestore();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle pattern with no scores gracefully', () => {
      const patternNoScores: AutoragPattern = {
        ...mockPattern,
        scores: {},
      };
      render(<PatternDetailsModal {...defaultProps} patterns={[patternNoScores]} />);

      expect(screen.getByText('Score type')).toBeInTheDocument();
    });

    it('should not show Sample Q&A tab when evaluationResults is empty', () => {
      mockUsePatternEvaluationResults.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });
      render(<PatternDetailsModal {...defaultProps} />);
      expect(screen.queryByText('Sample Q&A')).not.toBeInTheDocument();
    });
  });

  describe('comparison mode', () => {
    const comparisonPattern: AutoragPattern = {
      ...mockPattern,
      name: 'pattern1',
      iteration: 1,
      max_combinations: 10,
      duration_seconds: 90,
      final_score: 0.45,
      scores: {
        answer_correctness: { mean: 0.55, ci_low: 0.3, ci_high: 0.7 },
        faithfulness: { mean: 0.38, ci_low: 0.15, ci_high: 0.5 },
        context_correctness: { mean: 0.82, ci_low: 0.75, ci_high: 0.88 },
      },
    };

    const twoPatternProps = {
      ...defaultProps,
      patterns: [mockPattern, comparisonPattern],
    };

    it('should render Compare Patterns toggle', () => {
      render(<PatternDetailsModal {...twoPatternProps} />);
      expect(screen.getByTestId('compare-patterns-toggle')).toBeInTheDocument();
    });

    it('should open comparison select modal when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      await user.click(screen.getByTestId('compare-patterns-toggle'));

      expect(screen.getByTestId('pattern-comparison-select-modal')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-pattern-table')).toBeInTheDocument();
    });

    it('should exclude the selected pattern from comparison list', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      await user.click(screen.getByTestId('compare-patterns-toggle'));

      // pattern0 (selectedIndex=0) should be excluded, pattern1 should be present
      expect(screen.queryByTestId('comparison-pattern-row-0')).not.toBeInTheDocument();
      expect(screen.getByTestId('comparison-pattern-row-1')).toBeInTheDocument();
    });

    it('should show comparison column headers after selecting a comparison pattern', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      expect(screen.getByTestId('comparison-column-header-primary')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-column-header-comparison')).toBeInTheDocument();
    });

    it('should show "Pattern" row header in comparison mode', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      expect(screen.getByText('Pattern')).toBeInTheDocument();
    });

    it('should display both patterns values side by side', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      // Both patterns' unique field values should be visible
      // pattern0 has max_combinations=20, pattern1 has max_combinations=10
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show both score bars in comparison mode', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      // Primary scores
      expect(screen.getByText('0.650')).toBeInTheDocument();
      // Comparison scores
      expect(screen.getByText('0.550')).toBeInTheDocument();
    });

    it('should disable comparison when toggle is turned off', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      // Enable comparison
      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      expect(screen.getByTestId('comparison-column-header-comparison')).toBeInTheDocument();

      // Disable comparison
      await user.click(screen.getByTestId('compare-patterns-toggle'));

      expect(screen.queryByTestId('comparison-column-header-comparison')).not.toBeInTheDocument();
    });

    it('should show comparison on settings tabs too', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      // Enable comparison
      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      // Switch to chunking tab
      await user.click(screen.getByTestId('tab-chunking'));

      expect(screen.getByTestId('comparison-column-header-primary')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-column-header-comparison')).toBeInTheDocument();
    });

    it('should disable confirm button when the already-compared pattern is still selected', async () => {
      const user = userEvent.setup();
      const thirdPattern: AutoragPattern = {
        ...mockPattern,
        name: 'pattern2',
        iteration: 2,
        final_score: 0.3,
      };
      const threePatternProps = {
        ...defaultProps,
        patterns: [mockPattern, comparisonPattern, thirdPattern],
      };

      render(<PatternDetailsModal {...threePatternProps} />);

      // Enable comparison with pattern1
      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      // Open the "Change" modal — pattern1 is pre-selected
      await user.click(screen.getByTestId('change-comparison-pattern'));

      // Confirm button should be disabled since the same pattern is still selected
      expect(screen.getByTestId('compare-pattern-confirm')).toBeDisabled();

      // Select a different pattern — confirm should become enabled
      await user.click(screen.getByTestId('comparison-pattern-row-2'));
      expect(screen.getByTestId('compare-pattern-confirm')).toBeEnabled();
    });

    it('should cancel comparison select modal without enabling comparison', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...twoPatternProps} />);

      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-modal-cancel'));

      expect(screen.queryByTestId('comparison-column-header-comparison')).not.toBeInTheDocument();
    });

    it('should reset comparison state when modal reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<PatternDetailsModal {...twoPatternProps} />);

      // Enable comparison
      await user.click(screen.getByTestId('compare-patterns-toggle'));
      await user.click(screen.getByTestId('comparison-pattern-row-1'));
      await user.click(screen.getByTestId('compare-pattern-confirm'));

      expect(screen.getByTestId('comparison-column-header-comparison')).toBeInTheDocument();

      // Close and reopen
      rerender(<PatternDetailsModal {...twoPatternProps} isOpen={false} />);
      rerender(<PatternDetailsModal {...twoPatternProps} isOpen />);

      expect(screen.queryByTestId('comparison-column-header-comparison')).not.toBeInTheDocument();
    });
  });

  describe('actions dropdown', () => {
    it('should render the Actions dropdown toggle', () => {
      render(<PatternDetailsModal {...defaultProps} onSaveNotebook={jest.fn()} />);
      expect(screen.getByTestId('pattern-details-actions-toggle')).toBeInTheDocument();
    });

    it('should show save notebook options when dropdown is opened', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} onSaveNotebook={jest.fn()} />);

      await user.click(screen.getByTestId('pattern-details-actions-toggle'));
      expect(screen.getByTestId('pattern-details-save-indexing-notebook')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-details-save-inference-notebook')).toBeInTheDocument();
    });

    it('should call onSaveNotebook with indexing type when indexing option is clicked', async () => {
      const user = userEvent.setup();
      const onSaveNotebook = jest.fn();
      render(<PatternDetailsModal {...defaultProps} onSaveNotebook={onSaveNotebook} />);

      await user.click(screen.getByTestId('pattern-details-actions-toggle'));
      await user.click(screen.getByText('Save as indexing notebook'));
      expect(onSaveNotebook).toHaveBeenCalledWith('pattern0', 'indexing');
    });

    it('should call onSaveNotebook with inference type when inference option is clicked', async () => {
      const user = userEvent.setup();
      const onSaveNotebook = jest.fn();
      render(<PatternDetailsModal {...defaultProps} onSaveNotebook={onSaveNotebook} />);

      await user.click(screen.getByTestId('pattern-details-actions-toggle'));
      await user.click(screen.getByText('Save as inference notebook'));
      expect(onSaveNotebook).toHaveBeenCalledWith('pattern0', 'inference');
    });

    it('should show "Try this pattern" when pattern has responses_template and onTryPattern is provided', async () => {
      const user = userEvent.setup();
      const patternWithTemplate: AutoragPattern = {
        ...mockPattern,
        settings: {
          ...mockPattern.settings,
          responses_template: {
            model: 'test-model',
            stream: false,
            store: true,
            input: [
              {
                type: 'message' as const,
                role: 'user' as const,
                content: [{ type: 'input_text' as const, text: '<user_query_placeholder>' }],
              },
            ],
            metadata: { autorag_run_id: '123', rag_pattern_name: 'pattern0' },
            instructions: 'Answer from file_search results.',
            tools: [
              {
                type: 'file_search' as const,
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
          },
        },
      };

      const onTryPattern = jest.fn();
      const onClose = jest.fn();
      render(
        <PatternDetailsModal
          {...defaultProps}
          patterns={[patternWithTemplate]}
          onTryPattern={onTryPattern}
          onClose={onClose}
        />,
      );

      await user.click(screen.getByTestId('pattern-details-actions-toggle'));
      expect(screen.getByText('Try this pattern')).toBeInTheDocument();

      await user.click(screen.getByText('Try this pattern'));
      expect(onClose).toHaveBeenCalled();
      expect(onTryPattern).toHaveBeenCalledWith('pattern0');
    });

    it('should not show "Try this pattern" when pattern lacks responses_template', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} onTryPattern={jest.fn()} />);

      await user.click(screen.getByTestId('pattern-details-actions-toggle'));
      expect(screen.queryByText('Try this pattern')).not.toBeInTheDocument();
    });

    it('should show "View code" when pattern has responses_template and onViewCode is provided', async () => {
      const user = userEvent.setup();
      const patternWithTemplate: AutoragPattern = {
        ...mockPattern,
        settings: {
          ...mockPattern.settings,
          responses_template: {
            model: 'test-model',
            stream: false,
            store: true,
            input: [
              {
                type: 'message' as const,
                role: 'user' as const,
                content: [{ type: 'input_text' as const, text: '<user_query_placeholder>' }],
              },
            ],
            metadata: { autorag_run_id: '123', rag_pattern_name: 'pattern0' },
            instructions: 'Answer from file_search results.',
            tools: [
              {
                type: 'file_search' as const,
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
          },
        },
      };

      const onViewCode = jest.fn();
      const onClose = jest.fn();
      render(
        <PatternDetailsModal
          {...defaultProps}
          patterns={[patternWithTemplate]}
          onViewCode={onViewCode}
          onClose={onClose}
        />,
      );

      await user.click(screen.getByTestId('pattern-details-actions-toggle'));
      expect(screen.getByText('View code')).toBeInTheDocument();

      await user.click(screen.getByText('View code'));
      expect(onClose).toHaveBeenCalled();
      expect(onViewCode).toHaveBeenCalledWith('pattern0');
    });

    it('should not show "View code" when pattern lacks responses_template', async () => {
      const user = userEvent.setup();
      render(<PatternDetailsModal {...defaultProps} onViewCode={jest.fn()} />);

      await user.click(screen.getByTestId('pattern-details-actions-toggle'));
      expect(screen.queryByText('View code')).not.toBeInTheDocument();
    });
  });
});
