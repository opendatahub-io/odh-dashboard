import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvaluationJob } from '~/app/types';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationsTable from '../EvaluationsTable';

const mockJobs: EvaluationJob[] = [
  mockEvaluationJob({
    id: 'job-1',
    tenant: 'Alpha Evaluation',
    state: 'completed',
    modelName: 'gpt-4',
    benchmarkId: 'MMLU',
    createdAt: '2026-02-20T10:00:00Z',
    metrics: { score: 0.85 },
  }),
  mockEvaluationJob({
    id: 'job-2',
    tenant: 'Beta Evaluation',
    state: 'running',
    modelName: 'llama-3',
    benchmarkId: 'HellaSwag',
    createdAt: '2026-02-22T08:00:00Z',
  }),
  mockEvaluationJob({
    id: 'job-3',
    tenant: 'Gamma Evaluation',
    state: 'failed',
    modelName: 'claude-3',
    benchmarkId: 'TruthfulQA',
    createdAt: '2026-02-18T12:00:00Z',
  }),
];

describe('EvaluationsTable', () => {
  it('should return null when not loaded', () => {
    const { container } = render(<EvaluationsTable evaluations={[]} loaded={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the toolbar', () => {
    render(<EvaluationsTable evaluations={mockJobs} loaded />);
    expect(screen.getByTestId('evaluations-table-toolbar')).toBeInTheDocument();
  });

  it('should render the table with rows', () => {
    render(<EvaluationsTable evaluations={mockJobs} loaded />);
    expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-row-2')).toBeInTheDocument();
  });

  it('should render the New evaluation button', () => {
    render(<EvaluationsTable evaluations={mockJobs} loaded />);
    expect(screen.getByTestId('create-evaluation-button')).toHaveTextContent('New evaluation');
  });

  describe('filtering', () => {
    it('should filter by evaluation name', () => {
      render(<EvaluationsTable evaluations={mockJobs} loaded />);
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
      expect(screen.queryByTestId('evaluation-row-1')).not.toBeInTheDocument();
    });

    it('should show empty filter state when no matches', () => {
      render(<EvaluationsTable evaluations={mockJobs} loaded />);
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('evaluations-empty-filter-state')).toBeInTheDocument();
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should clear filters and show all rows', () => {
      render(<EvaluationsTable evaluations={mockJobs} loaded />);
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByTestId('evaluations-empty-filter-state')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('clear-filters-button'));
      expect(screen.queryByTestId('evaluations-empty-filter-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      render(<EvaluationsTable evaluations={mockJobs} loaded />);
      const searchInput = screen.getByTestId('filter-toolbar-text-field').querySelector('input')!;
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should render pagination controls', () => {
      render(<EvaluationsTable evaluations={mockJobs} loaded />);
      const toolbar = screen.getByTestId('evaluations-table-toolbar');
      expect(toolbar.querySelector('.pf-v6-c-pagination')).toBeInTheDocument();
    });

    it('should show all rows when count is below perPage', () => {
      render(<EvaluationsTable evaluations={mockJobs} loaded />);
      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('evaluation-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('evaluation-row-2')).toBeInTheDocument();
    });

    it('should paginate when there are more items than perPage', () => {
      const manyJobs = Array.from({ length: 25 }, (_, i) =>
        mockEvaluationJob({
          id: `job-${i}`,
          tenant: `Evaluation ${i}`,
          createdAt: `2026-02-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        }),
      );
      render(<EvaluationsTable evaluations={manyJobs} loaded />);
      expect(screen.getByTestId('evaluation-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('evaluation-row-19')).toBeInTheDocument();
      expect(screen.queryByTestId('evaluation-row-20')).not.toBeInTheDocument();
    });
  });

  describe('column headers', () => {
    it('should render all expected column headers in the table', () => {
      render(<EvaluationsTable evaluations={mockJobs} loaded />);
      const table = screen.getByTestId('evaluations-table');
      expect(table).toHaveTextContent('Evaluation name');
      expect(table).toHaveTextContent('Status');
      expect(table).toHaveTextContent('Collection/Benchmark');
      expect(table).toHaveTextContent('Type');
      expect(table).toHaveTextContent('Run date');
      expect(table).toHaveTextContent('Result');
    });
  });
});
