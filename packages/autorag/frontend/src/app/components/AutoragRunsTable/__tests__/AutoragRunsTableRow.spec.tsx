/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { PipelineRun } from '~/app/types';
import AutoragRunsTableRow from '~/app/components/AutoragRunsTable/AutoragRunsTableRow';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('mod-arch-shared', () => ({
  relativeTime: () => '2 hours ago',
}));

const mockRun: PipelineRun = {
  run_id: 'test-run-123',
  display_name: 'Test Run Name',
  description: 'Test description',
  state: 'RUNNING',
  created_at: '2025-01-17T10:00:00Z',
  pipeline_version_reference: {
    pipeline_id: 'pipeline-1',
    pipeline_version_id: 'version-1',
  },
};

describe('AutoragRunsTableRow', () => {
  const mockNamespace = 'test-namespace';

  it('should render run name as a link', () => {
    render(
      <table>
        <tbody>
          <AutoragRunsTableRow run={mockRun} namespace={mockNamespace} />
        </tbody>
      </table>,
    );

    const link = screen.getByTestId('run-name-test-run-123');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Test Run Name');
    expect(link).toHaveAttribute(
      'href',
      '/gen-ai-studio/autorag/results/test-namespace/test-run-123',
    );
  });

  it('should render description', () => {
    render(
      <table>
        <tbody>
          <AutoragRunsTableRow run={mockRun} namespace={mockNamespace} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render em-dash when description is missing', () => {
    const runWithoutDesc = { ...mockRun, description: undefined };
    render(
      <table>
        <tbody>
          <AutoragRunsTableRow run={runWithoutDesc} namespace={mockNamespace} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render relative time', () => {
    render(
      <table>
        <tbody>
          <AutoragRunsTableRow run={mockRun} namespace={mockNamespace} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('should render state label with correct status', () => {
    render(
      <table>
        <tbody>
          <AutoragRunsTableRow run={mockRun} namespace={mockNamespace} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('should render success status for SUCCEEDED state', () => {
    const succeededRun = { ...mockRun, state: 'SUCCEEDED' };
    render(
      <table>
        <tbody>
          <AutoragRunsTableRow run={succeededRun} namespace={mockNamespace} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
  });

  it('should render danger status for FAILED state', () => {
    const failedRun = { ...mockRun, state: 'FAILED' };
    render(
      <table>
        <tbody>
          <AutoragRunsTableRow run={failedRun} namespace={mockNamespace} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });
});
