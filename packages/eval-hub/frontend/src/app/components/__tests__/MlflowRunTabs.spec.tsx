import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
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

  it('should show a retryable error and track the event when the remote fails to load', async () => {
    mockLoadRemote.mockRejectedValue(new Error('chunk 404'));

    render(<MlflowRunTabs {...defaultProps} />);

    await waitFor(() => expect(screen.getByTestId('mlflow-run-tabs-error')).toBeInTheDocument());
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.MLFLOW_RUN_TABS_LOAD_FAILED,
      {},
    );
  });

  it('should retry the load when Try again is clicked', async () => {
    const first = deferred<{ default: React.ComponentType }>();
    const second = deferred<{ default: React.ComponentType }>();
    mockLoadRemote.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    render(<MlflowRunTabs {...defaultProps} />);

    first.reject(new Error('transient blip'));
    await waitFor(() => expect(screen.getByTestId('mlflow-run-tabs-error')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockLoadRemote).toHaveBeenCalledTimes(2));

    second.resolve({ default: RemoteComponent });
    await waitFor(() => expect(screen.getByTestId('remote-run-tabs')).toBeInTheDocument());
    expect(screen.queryByTestId('mlflow-run-tabs-error')).not.toBeInTheDocument();
  });

  it('should offer retry and page reload actions in the error state', async () => {
    // window.location.reload cannot be mocked in jsdom (non-configurable), so the
    // reload handler itself is not directly asserted here.
    mockLoadRemote.mockRejectedValue(new Error('stale remote entry'));

    render(<MlflowRunTabs {...defaultProps} />);

    await waitFor(() => expect(screen.getByTestId('mlflow-run-tabs-error')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeEnabled();
  });
});
