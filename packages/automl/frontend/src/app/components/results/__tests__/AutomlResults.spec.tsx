/* eslint-disable camelcase */
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutomlResults from '~/app/components/results/AutomlResults';
import type { PipelineRun } from '~/app/types';

jest.mock('~/app/topology/PipelineTopology', () => ({
  __esModule: true,
  default: ({ nodes, className }: { nodes: unknown[]; className?: string }) => (
    <div data-testid="pipeline-topology" data-node-count={nodes.length} className={className} />
  ),
}));

jest.mock('~/app/topology/useAutoMLTaskTopology', () => ({
  useAutoMLTaskTopology: jest.fn().mockReturnValue([{ id: 'task-1' }, { id: 'task-2' }]),
}));

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'My AutoML Run',
  state: 'SUCCEEDED',
  created_at: '2025-06-01T00:00:00Z',
};

describe('AutomlResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the PipelineTopology component', () => {
    render(<AutomlResults pipelineRun={mockPipelineRun} />);
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  it('should pass the automl-topology-container className to PipelineTopology', () => {
    render(<AutomlResults pipelineRun={mockPipelineRun} />);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveClass('automl-topology-container');
  });

  it('should pass nodes from useAutoMLTaskTopology to PipelineTopology', () => {
    render(<AutomlResults pipelineRun={mockPipelineRun} />);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveAttribute('data-node-count', '2');
  });

  it('should render gracefully when pipelineRun is undefined', () => {
    render(<AutomlResults />);
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });
});
