/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PipelineRun } from '~/app/types';
import AutoragRunsTableRow from '~/app/components/AutoragRunsTable/AutoragRunsTableRow';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

const trackEventMock = jest.fn();
const TrackingWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <TrackingProvider trackEvent={trackEventMock}>{children}</TrackingProvider>
);
const renderWithTracking = (ui: React.ReactElement) => render(ui, { wrapper: TrackingWrapper });

const mockHandleRetry = jest.fn().mockResolvedValue(undefined);
const mockHandleConfirmStop = jest.fn().mockResolvedValue(undefined);

jest.mock('~/app/hooks/useAutoragRunActions', () => ({
  useAutoragRunActions: () => ({
    handleRetry: mockHandleRetry,
    handleConfirmStop: mockHandleConfirmStop,
    isRetrying: false,
    isTerminating: false,
  }),
}));

describe('AutoragRunsTableRow', () => {
  const mockRun: PipelineRun = {
    run_id: 'r1',
    display_name: 'Run One',
    description: 'First run',
    state: 'SUCCEEDED',
    created_at: '2025-01-17',
  };

  const mockNamespace = 'test-namespace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render run name', () => {
    renderWithTracking(
      <MemoryRouter>
        <AutoragRunsTableRow run={mockRun} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('run-name-r1')).toHaveTextContent('Run One');
  });

  it('should render description', () => {
    renderWithTracking(
      <MemoryRouter>
        <AutoragRunsTableRow run={mockRun} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(screen.getByText('First run')).toBeInTheDocument();
  });

  it('should render em dash for missing description', () => {
    renderWithTracking(
      <MemoryRouter>
        <AutoragRunsTableRow
          run={{ ...mockRun, description: undefined }}
          namespace={mockNamespace}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render state with Label', () => {
    renderWithTracking(
      <MemoryRouter>
        <AutoragRunsTableRow run={mockRun} namespace={mockNamespace} />
      </MemoryRouter>,
    );
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
  });

  it.each([
    ['RUNNING', 'stop-run-action', 'stop-run-modal', 'AutoRAG Run Stopped'],
    ['SUCCEEDED', 'delete-run-action', 'delete-run-modal', 'AutoRAG Experiment Deleted'],
  ] as const)(
    'should track a %s run confirmation cancellation once without success',
    async (state, actionId, modalId, eventName) => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      expect(trackEventMock).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Kebab toggle' }));
      await userEvent.click(screen.getByTestId(actionId));
      expect(trackEventMock).not.toHaveBeenCalled();
      await userEvent.click(
        within(screen.getByTestId(modalId)).getByRole('button', { name: 'Cancel' }),
      );
      expect(trackEventMock.mock.calls).toEqual([
        [eventName, { outcome: 'cancel', source: 'runsList' }],
      ]);
      expect(screen.queryByTestId(modalId)).not.toBeInTheDocument();
      expect(mockHandleConfirmStop).not.toHaveBeenCalled();
    },
  );

  describe('kebab action menu', () => {
    it('should show reconfigure and delete actions for succeeded runs', async () => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state: 'SUCCEEDED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('reconfigure-run-action')).toBeInTheDocument();
      expect(screen.getByTestId('delete-run-action')).toBeInTheDocument();
      expect(screen.queryByTestId('stop-run-action')).not.toBeInTheDocument();
      expect(screen.queryByTestId('retry-run-action')).not.toBeInTheDocument();
    });

    it('should only show reconfigure action for canceling runs', async () => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state: 'CANCELING' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('reconfigure-run-action')).toBeInTheDocument();
      expect(screen.queryByTestId('stop-run-action')).not.toBeInTheDocument();
      expect(screen.queryByTestId('retry-run-action')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-run-action')).not.toBeInTheDocument();
    });

    it('should show stop action for running runs', async () => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state: 'RUNNING' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('stop-run-action')).toBeInTheDocument();
    });

    it('should show retry action for failed runs', async () => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state: 'FAILED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('retry-run-action')).toBeInTheDocument();
    });

    it('should show retry action for canceled runs', async () => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state: 'CANCELED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      expect(screen.getByTestId('retry-run-action')).toBeInTheDocument();
    });

    it('should open stop modal when stop action is clicked', async () => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state: 'RUNNING' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      await userEvent.click(screen.getByTestId('stop-run-action'));
      expect(screen.getByTestId('stop-run-modal')).toBeInTheDocument();
    });

    it('should show run name in stop modal', async () => {
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow
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
      renderWithTracking(
        <MemoryRouter>
          <AutoragRunsTableRow run={{ ...mockRun, state: 'FAILED' }} namespace={mockNamespace} />
        </MemoryRouter>,
      );
      const kebab = screen.getByRole('button', { name: 'Kebab toggle' });
      await userEvent.click(kebab);
      await userEvent.click(screen.getByTestId('retry-run-action'));
      expect(mockHandleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
