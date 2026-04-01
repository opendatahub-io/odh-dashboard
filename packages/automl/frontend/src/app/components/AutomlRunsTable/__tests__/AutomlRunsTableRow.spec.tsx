/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PipelineRun } from '~/app/types';
import AutomlRunsTableRow, {
  getStatusLabelProps,
} from '~/app/components/AutomlRunsTable/AutomlRunsTableRow';

describe('getStatusLabelProps', () => {
  it('should return success status for SUCCEEDED', () => {
    expect(getStatusLabelProps('SUCCEEDED')).toEqual({ status: 'success' });
    expect(getStatusLabelProps('succeeded')).toEqual({ status: 'success' });
  });

  it('should return success status for COMPLETE', () => {
    expect(getStatusLabelProps('COMPLETE')).toEqual({ status: 'success' });
    expect(getStatusLabelProps('complete')).toEqual({ status: 'success' });
  });

  it('should return success status when state includes succeeded', () => {
    expect(getStatusLabelProps('CUSTOM_SUCCEEDED')).toEqual({ status: 'success' });
  });

  it('should return danger status for FAILED', () => {
    expect(getStatusLabelProps('FAILED')).toEqual({ status: 'danger' });
    expect(getStatusLabelProps('failed')).toEqual({ status: 'danger' });
  });

  it('should return danger status when state includes failed', () => {
    expect(getStatusLabelProps('CUSTOM_FAILED')).toEqual({ status: 'danger' });
  });

  it('should return info status for RUNNING', () => {
    expect(getStatusLabelProps('RUNNING')).toEqual({ status: 'info' });
    expect(getStatusLabelProps('running')).toEqual({ status: 'info' });
  });

  it('should return info status when state includes running', () => {
    expect(getStatusLabelProps('STILL_RUNNING')).toEqual({ status: 'info' });
  });

  it('should return warning status for PENDING', () => {
    expect(getStatusLabelProps('PENDING')).toEqual({ status: 'warning' });
    expect(getStatusLabelProps('pending')).toEqual({ status: 'warning' });
  });

  it('should return warning status for INCOMPLETE', () => {
    expect(getStatusLabelProps('INCOMPLETE')).toEqual({ status: 'warning' });
    expect(getStatusLabelProps('incomplete')).toEqual({ status: 'warning' });
  });

  it('should return warning status when state includes pending', () => {
    expect(getStatusLabelProps('AWAITING_PENDING')).toEqual({ status: 'warning' });
  });

  it('should return warning status for PAUSED', () => {
    expect(getStatusLabelProps('PAUSED')).toEqual({ status: 'warning' });
  });

  it('should return grey color for SKIPPED', () => {
    expect(getStatusLabelProps('SKIPPED')).toEqual({ color: 'grey' });
  });

  it('should return grey color for CANCELLED', () => {
    expect(getStatusLabelProps('CANCELLED')).toEqual({ color: 'grey' });
  });

  it('should return grey color for unknown state', () => {
    expect(getStatusLabelProps('UNKNOWN')).toEqual({ color: 'grey' });
  });

  it('should return grey color for empty or undefined state', () => {
    expect(getStatusLabelProps('')).toEqual({ color: 'grey' });
    expect(getStatusLabelProps(undefined)).toEqual({ color: 'grey' });
  });
});

describe('AutomlRunsTableRow', () => {
  const mockRun: PipelineRun = {
    run_id: 'r1',
    display_name: 'Run One',
    description: 'First run',
    state: 'SUCCEEDED',
    created_at: '2025-01-17',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  };

  const mockNamespace = 'test-namespace';

  it('should render run name', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTableRow run={mockRun} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('run-name-r1')).toHaveTextContent('Run One');
  });

  it('should render description', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTableRow run={mockRun} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(screen.getByText('First run')).toBeInTheDocument();
  });

  it('should render em dash for missing description', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTableRow
          run={{ ...mockRun, description: undefined }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render state with Label', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTableRow run={mockRun} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
  });

  it('should render different states correctly', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AutomlRunsTableRow run={mockRun} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AutomlRunsTableRow
          run={{ ...mockRun, state: 'FAILED', run_id: 'r2' }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('FAILED')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AutomlRunsTableRow
          run={{ ...mockRun, state: 'RUNNING', run_id: 'r3' }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('should render without crashing for invalid created_at', () => {
    const { container } = render(
      <MemoryRouter>
        <AutomlRunsTableRow
          run={{ ...mockRun, created_at: 'invalid-date' }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(container).toBeInTheDocument();
  });

  it('should render without crashing for empty created_at', () => {
    const { container } = render(
      <MemoryRouter>
        <AutomlRunsTableRow run={{ ...mockRun, created_at: '' }} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(container).toBeInTheDocument();
  });
});
