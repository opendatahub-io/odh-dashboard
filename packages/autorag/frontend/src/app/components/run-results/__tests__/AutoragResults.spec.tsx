/* eslint-disable camelcase */
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import {
  AutoragResultsContext,
  type AutoragResultsContextProps,
} from '~/app/context/AutoragResultsContext';
import type { PipelineRun } from '~/app/types';

jest.mock('~/app/topology/PipelineTopology', () => ({
  __esModule: true,
  default: ({ nodes, className }: { nodes: unknown[]; className?: string }) => (
    <div data-testid="pipeline-topology" data-node-count={nodes.length} className={className} />
  ),
}));

jest.mock('~/app/topology/useAutoRAGTaskTopology', () => ({
  useAutoRAGTaskTopology: jest.fn().mockReturnValue([{ id: 'task-1' }, { id: 'task-2' }]),
}));

jest.mock('~/app/components/run-results/AutoragLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="autorag-leaderboard" />,
}));

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'My AutoRAG Run',
  state: 'SUCCEEDED',
  created_at: '2025-06-01T00:00:00Z',
};

const defaultContextValue: AutoragResultsContextProps = {
  pipelineRun: mockPipelineRun,
  pipelineRunLoading: false,
  patterns: {},
  patternsLoading: false,
  parameters: {},
};

const renderWithContext = (contextValue: Partial<AutoragResultsContextProps> = {}) => {
  const value = { ...defaultContextValue, ...contextValue };
  return render(
    <AutoragResultsContext.Provider value={value}>
      <AutoragResults />
    </AutoragResultsContext.Provider>,
  );
};

describe('AutoragResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the PipelineTopology component', () => {
    renderWithContext();
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  it('should render the AutoragLeaderboard component', () => {
    renderWithContext();
    expect(screen.getByTestId('autorag-leaderboard')).toBeInTheDocument();
  });

  it('should pass the autorag-topology-container className to PipelineTopology', () => {
    renderWithContext();
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveClass('autorag-topology-container');
  });

  it('should pass nodes from useAutoRAGTaskTopology to PipelineTopology', () => {
    renderWithContext();
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveAttribute('data-node-count', '2');
  });

  it('should render gracefully when pipelineRun is undefined', () => {
    renderWithContext({ pipelineRun: undefined });
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
    expect(screen.getByTestId('autorag-leaderboard')).toBeInTheDocument();
  });
});
