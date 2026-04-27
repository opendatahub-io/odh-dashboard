/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PipelineRun } from '~/app/types';
import AutomlRunsTableRow, {
  getStatusLabelProps,
} from '~/app/components/AutomlRunsTable/AutomlRunsTableRow';

const mockHandleRetry = jest.fn();
const mockHandleConfirmStop = jest.fn();

jest.mock('~/app/hooks/useAutomlRunActions', () => ({
  useAutomlRunActions: () => ({
    handleRetry: mockHandleRetry,
    handleConfirmStop: mockHandleConfirmStop,
    isRetrying: false,
    isTerminating: false,
  }),
}));

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

  it('should return blue color for RUNNING', () => {
    expect(getStatusLabelProps('RUNNING')).toEqual({ color: 'blue' });
    expect(getStatusLabelProps('running')).toEqual({ color: 'blue' });
  });

  it('should return blue color when state includes running', () => {
    expect(getStatusLabelProps('STILL_RUNNING')).toEqual({ color: 'blue' });
  });

  it('should return purple color for PENDING', () => {
    expect(getStatusLabelProps('PENDING')).toEqual({ color: 'purple' });
    expect(getStatusLabelProps('pending')).toEqual({ color: 'purple' });
  });

  it('should return warning status for INCOMPLETE', () => {
    expect(getStatusLabelProps('INCOMPLETE')).toEqual({ status: 'warning' });
    expect(getStatusLabelProps('incomplete')).toEqual({ status: 'warning' });
  });

  it('should return purple color when state includes pending', () => {
    expect(getStatusLabelProps('AWAITING_PENDING')).toEqual({ color: 'purple' });
  });

  it('should return grey color for PAUSED', () => {
    expect(getStatusLabelProps('PAUSED')).toEqual({ color: 'grey' });
  });

  it('should return success status for SKIPPED', () => {
    expect(getStatusLabelProps('SKIPPED')).toEqual({ status: 'success' });
    expect(getStatusLabelProps('skipped')).toEqual({ status: 'success' });
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
          run={{
            ...mockRun,
            description: undefined,
            runtime_config: { parameters: { task_type: 'binary' } as never },
          }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render friendly prediction type label', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTableRow
          run={{ ...mockRun, runtime_config: { parameters: { task_type: 'binary' } as never } }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Binary classification')).toBeInTheDocument();
  });

  it('should render em dash when runtime_config is missing', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTableRow
          run={{ ...mockRun, runtime_config: undefined }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('should default prediction type to time series forecasting when task_type is missing', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTableRow
          run={{ ...mockRun, runtime_config: { parameters: {} as never } }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Time series forecasting')).toBeInTheDocument();
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

  describe('kebab action menu', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show delete action for succeeded runs', async () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow run={{ ...mockRun, state: 'SUCCEEDED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('delete-run-action')).toBeInTheDocument();
    });

    it('should not show kebab menu for canceling runs', () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow run={{ ...mockRun, state: 'CANCELING' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('button', { name: 'Kebab toggle' })).not.toBeInTheDocument();
    });

    it('should show stop action for running runs', async () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow run={{ ...mockRun, state: 'RUNNING' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('stop-run-action')).toBeInTheDocument();
    });

    it('should show retry action for failed runs', async () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow run={{ ...mockRun, state: 'FAILED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('retry-run-action')).toBeInTheDocument();
    });

    it('should show retry action for canceled runs', async () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow run={{ ...mockRun, state: 'CANCELED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('retry-run-action')).toBeInTheDocument();
    });

    it('should open stop modal when stop action is clicked', async () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow run={{ ...mockRun, state: 'RUNNING' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      await userEvent.click(screen.getByTestId('stop-run-action'));
      expect(screen.getByTestId('stop-run-modal')).toBeInTheDocument();
    });

    it('should show run name in stop modal', async () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow
            run={{ ...mockRun, state: 'RUNNING', display_name: 'My Run' }}
            namespace={mockNamespace}
          />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      await userEvent.click(screen.getByTestId('stop-run-action'));
      const modal = screen.getByTestId('stop-run-modal');
      expect(within(modal).getByText(/My Run/)).toBeInTheDocument();
    });

    it('should call handleRetry when retry action is clicked', async () => {
      render(
        <MemoryRouter>
          <AutomlRunsTableRow run={{ ...mockRun, state: 'FAILED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      await userEvent.click(screen.getByTestId('retry-run-action'));
      expect(mockHandleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
