/* eslint-disable camelcase */
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutoragResults from '~/app/components/results/AutoragResults';
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

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'My AutoRAG Run',
  state: 'SUCCEEDED',
  created_at: '2025-06-01T00:00:00Z',
};

describe('AutoragResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the PipelineTopology component', () => {
    render(<AutoragResults pipelineRun={mockPipelineRun} />);
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  it('should pass the autorag-topology-container className to PipelineTopology', () => {
    render(<AutoragResults pipelineRun={mockPipelineRun} />);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveClass('autorag-topology-container');
  });

  it('should pass nodes from useAutoRAGTaskTopology to PipelineTopology', () => {
    render(<AutoragResults pipelineRun={mockPipelineRun} />);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveAttribute('data-node-count', '2');
  });

  it('should render gracefully when pipelineRun is undefined', () => {
    render(<AutoragResults />);
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });
});
