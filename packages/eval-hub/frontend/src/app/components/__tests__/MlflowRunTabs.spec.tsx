import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { loadRemote } from '@module-federation/runtime';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import MlflowRunTabs from '~/app/components/MlflowRunTabs';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

jest.mock('@module-federation/runtime', () => ({
  loadRemote: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockLoadRemote = jest.mocked(loadRemote);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

const RemoteComponent = jest.fn(() => <div data-testid="remote-run-tabs" />);

const defaultProps = { experimentId: '16', runUuid: 'run-1', workspace: 'test-ns' };

/** Flushes pending promise reactions without advancing timers. */
async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    // Awaiting act flushes queued microtasks (promise reactions) only.
  });
}

/**
 * Advances jest fake timers past the component's automatic retry backoff
 * (RETRY_DELAY_MS * attempt: 1s after the first failure, 2s after the second),
 * flushing the intermediate promise reactions via act.
 */
async function advancePastAutoRetries(): Promise<void> {
  // Let the initial attempt's rejection flush so the first backoff timer exists.
  await flushMicrotasks();
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MlflowRunTabs', () => {
  it('should render a spinner while the remote is loading', () => {
    mockLoadRemote.mockReturnValue(
      new Promise(() => {
        // Intentionally never resolves — keeps the component in the loading state.
      }),
    );

    render(<MlflowRunTabs {...defaultProps} />);

    expect(screen.getByTestId('mlflow-run-tabs-loading')).toBeInTheDocument();
    expect(mockLoadRemote).toHaveBeenCalledWith('mlflowEmbedded/MlflowRunTabsWrapper');
  });

  it('should render the remote component with the run props once loaded', async () => {
    mockLoadRemote.mockResolvedValue({ default: RemoteComponent });

    render(<MlflowRunTabs {...defaultProps} />);

    await waitFor(() => expect(screen.getByTestId('remote-run-tabs')).toBeInTheDocument());
    expect(RemoteComponent).toHaveBeenCalledWith(defaultProps, expect.anything());
  });

  it('should render nothing when the remote resolves without a component', async () => {
    mockLoadRemote.mockResolvedValue(undefined);

    const { container } = render(<MlflowRunTabs {...defaultProps} />);

    await waitFor(() =>
      expect(screen.queryByTestId('mlflow-run-tabs-loading')).not.toBeInTheDocument(),
    );
    expect(container.firstChild).toBeNull();
  });

  it('should retry automatically and recover from a transient load failure', async () => {
    jest.useFakeTimers();
    mockLoadRemote
      .mockRejectedValueOnce(new Error('transient blip'))
      .mockResolvedValue({ default: RemoteComponent });

    render(<MlflowRunTabs {...defaultProps} />);

    // Flush the initial rejection, then advance past the 1s backoff to the retry.
    await flushMicrotasks();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockLoadRemote).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('remote-run-tabs')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-run-tabs-error')).not.toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('should show a retryable error and track the event after exhausting automatic retries', async () => {
    jest.useFakeTimers();
    mockLoadRemote.mockRejectedValue(new Error('chunk 404'));

    render(<MlflowRunTabs {...defaultProps} />);

    await advancePastAutoRetries();

    expect(mockLoadRemote).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('mlflow-run-tabs-error')).toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.MLFLOW_RUN_TABS_LOAD_FAILED,
      {},
    );
  });

  it('should restart the load cycle when Try again is clicked', async () => {
    jest.useFakeTimers();
    mockLoadRemote.mockRejectedValue(new Error('stale remote entry'));

    render(<MlflowRunTabs {...defaultProps} />);

    await advancePastAutoRetries();
    expect(screen.getByTestId('mlflow-run-tabs-error')).toBeInTheDocument();

    mockLoadRemote.mockResolvedValue({ default: RemoteComponent });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await flushMicrotasks();

    expect(mockLoadRemote).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId('remote-run-tabs')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-run-tabs-error')).not.toBeInTheDocument();
  });

  it('should offer retry and page reload actions in the error state', async () => {
    // window.location.reload cannot be mocked in jsdom (non-configurable), so the
    // reload handler itself is not directly asserted here.
    jest.useFakeTimers();
    mockLoadRemote.mockRejectedValue(new Error('stale remote entry'));

    render(<MlflowRunTabs {...defaultProps} />);

    await advancePastAutoRetries();

    expect(screen.getByTestId('mlflow-run-tabs-error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeEnabled();
  });
});
