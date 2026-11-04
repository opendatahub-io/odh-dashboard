import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { loadRemote } from '@module-federation/runtime';
import MlflowCompareRuns from '~/app/components/MlflowCompareRuns';

jest.mock('@module-federation/runtime', () => ({
  loadRemote: jest.fn(),
}));

const mockLoadRemote = jest.mocked(loadRemote);

const RemoteComponent = () => <div data-testid="remote-compare-runs" />;

const defaultProps = {
  experimentIds: ['exp-1', 'exp-2'],
  runUuids: ['run-1', 'run-2'],
  workspace: 'test-ns',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MlflowCompareRuns', () => {
  it('should render a spinner while the remote is loading and not report readiness', () => {
    mockLoadRemote.mockReturnValue(
      new Promise(() => {
        // Intentionally never resolves — keeps the component in the loading state.
      }),
    );

    const onRemoteReady = jest.fn();
    render(<MlflowCompareRuns {...defaultProps} onRemoteReady={onRemoteReady} />);

    expect(screen.getByTestId('mlflow-compare-runs-loading')).toBeInTheDocument();
    expect(mockLoadRemote).toHaveBeenCalledWith('mlflowEmbedded/MlflowCompareRunsWrapper');
    expect(onRemoteReady).not.toHaveBeenCalled();
  });

  it('should not report readiness until a delayed remote load resolves', async () => {
    let resolveLoad: (mod: { default: typeof RemoteComponent } | undefined) => void = () =>
      undefined;
    mockLoadRemote.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const onRemoteReady = jest.fn();
    render(<MlflowCompareRuns {...defaultProps} onRemoteReady={onRemoteReady} />);

    expect(screen.getByTestId('mlflow-compare-runs-loading')).toBeInTheDocument();
    expect(onRemoteReady).not.toHaveBeenCalled();

    await act(async () => {
      resolveLoad({ default: RemoteComponent });
    });

    await waitFor(() => expect(screen.getByTestId('remote-compare-runs')).toBeInTheDocument());
    expect(onRemoteReady).toHaveBeenCalledTimes(1);
    expect(onRemoteReady).toHaveBeenCalledWith(true);
  });

  it('should render the remote component without the readiness callback once loaded', async () => {
    mockLoadRemote.mockResolvedValue({ default: RemoteComponent });

    render(<MlflowCompareRuns {...defaultProps} />);

    await waitFor(() => expect(screen.getByTestId('remote-compare-runs')).toBeInTheDocument());
    expect(screen.queryByTestId('mlflow-compare-runs-loading')).not.toBeInTheDocument();
  });

  it('should show the unavailable state and report false when the remote resolves without a component', async () => {
    mockLoadRemote.mockResolvedValue(undefined);

    const onRemoteReady = jest.fn();
    render(<MlflowCompareRuns {...defaultProps} onRemoteReady={onRemoteReady} />);

    await waitFor(() =>
      expect(screen.getByTestId('mlflow-unavailable-empty-state')).toBeInTheDocument(),
    );
    expect(onRemoteReady).toHaveBeenCalledWith(false);
  });

  it('should show the unavailable state and report false when the remote load rejects', async () => {
    mockLoadRemote.mockRejectedValue(new Error('chunk 404'));

    const onRemoteReady = jest.fn();
    render(<MlflowCompareRuns {...defaultProps} onRemoteReady={onRemoteReady} />);

    await waitFor(() =>
      expect(screen.getByTestId('mlflow-unavailable-empty-state')).toBeInTheDocument(),
    );
    expect(onRemoteReady).toHaveBeenCalledWith(false);
  });
});
