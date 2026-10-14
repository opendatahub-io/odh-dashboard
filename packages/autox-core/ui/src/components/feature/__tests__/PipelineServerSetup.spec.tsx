import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import PipelineServerSetup from '../PipelineServerSetup';

const mockReadiness = jest.fn();
const mockEnable = jest.fn();

jest.mock('../EnableManagedPipelinesModal', () => ({
  __esModule: true,
  default: ({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) => (
    <div data-testid="enable-modal">
      <button type="button" onClick={onConfirm}>
        Confirm
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  ),
}));

jest.mock('../../../hooks', () => ({
  usePipelineServerReadinessQuery: (...args: unknown[]) => mockReadiness(...args),
  useEnableManagedPipelinesMutation: () => ({ mutateAsync: mockEnable, isPending: false }),
}));

const config = {
  productName: 'Test product',
  detailsRoute: (namespace?: string) => `/pipelines/${namespace ?? ''}`,
  isTransientError: () => true,
};

describe('PipelineServerSetup', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadiness.mockReturnValue({ data: undefined, isError: false, error: undefined });
  });

  it('should render the configure state with injected product text', () => {
    render(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="test-project" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Configure a pipeline server' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'To use Test product, configure a pipeline server with Test product pipelines enabled.',
      ),
    ).toBeInTheDocument();
  });

  it('should render the waiting details link using the injected route', () => {
    render(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="test-project" mode="waiting" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
  });

  it('should stop polling and report a timeout', () => {
    const onFailed = jest.fn();
    render(
      <MemoryRouter>
        <PipelineServerSetup
          config={config}
          namespace="test-project"
          mode="waiting"
          onFailed={onFailed}
        />
      </MemoryRouter>,
    );

    act(() => jest.advanceTimersByTime(120_000));

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('pipeline-server-polling')).not.toBeInTheDocument();
  });

  it('should stop polling on a non-transient readiness error', () => {
    const onFailed = jest.fn();
    mockReadiness.mockReturnValue({ data: undefined, isError: true, error: new Error('failed') });
    render(
      <MemoryRouter>
        <PipelineServerSetup
          config={config}
          namespace="test-project"
          mode="waiting"
          onFailed={onFailed}
        />
      </MemoryRouter>,
    );

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('pipeline-server-polling')).not.toBeInTheDocument();
  });

  it('should keep polling for transient errors', () => {
    const onFailed = jest.fn();
    mockReadiness.mockReturnValue({ data: false, isError: false, error: undefined });
    render(
      <MemoryRouter>
        <PipelineServerSetup
          config={config}
          namespace="test-project"
          mode="waiting"
          onFailed={onFailed}
        />
      </MemoryRouter>,
    );

    jest.advanceTimersByTime(10_000);

    expect(mockReadiness).toHaveBeenCalledWith('test-project', config.isTransientError, true);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('should report readiness once and stop polling', () => {
    const onReady = jest.fn();
    mockReadiness.mockReturnValue({ data: true, isError: false, error: undefined });
    render(
      <MemoryRouter>
        <PipelineServerSetup
          config={config}
          namespace="test-project"
          mode="waiting"
          onReady={onReady}
        />
      </MemoryRouter>,
    );

    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('should not call readiness callbacks after unmount', () => {
    const onReady = jest.fn();
    const { unmount } = render(
      <MemoryRouter>
        <PipelineServerSetup
          config={config}
          namespace="test-project"
          mode="waiting"
          onReady={onReady}
        />
      </MemoryRouter>,
    );
    unmount();
    jest.advanceTimersByTime(120_000);

    expect(onReady).not.toHaveBeenCalled();
  });

  it('should report an enable failure without starting readiness polling', async () => {
    mockEnable.mockRejectedValueOnce(new Error('permission denied'));
    const onFailed = jest.fn();
    render(
      <MemoryRouter>
        <PipelineServerSetup
          config={config}
          namespace="test-project"
          mode="enable"
          onFailed={onFailed}
        />
      </MemoryRouter>,
    );
    await act(async () => {
      screen.getByTestId('enable-managed-pipelines-button').click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Confirm' }).click();
      await Promise.resolve();
    });
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(mockReadiness).toHaveBeenCalledWith('test-project', config.isTransientError, false);
  });

  it('should transition from successful enable to readiness polling', async () => {
    mockEnable.mockResolvedValueOnce(undefined);
    mockReadiness.mockReturnValue({ data: false, isError: false, error: undefined });
    render(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="test-project" mode="enable" />
      </MemoryRouter>,
    );
    await act(async () => {
      screen.getByTestId('enable-managed-pipelines-button').click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Confirm' }).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument());
    expect(mockReadiness).toHaveBeenCalledWith('test-project', config.isTransientError, true);
  });

  it('should not start polling when enable completes after unmount', async () => {
    let resolveEnable: (() => void) | undefined;
    mockEnable.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveEnable = resolve;
      }),
    );
    const { unmount } = render(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="test-project" mode="enable" />
      </MemoryRouter>,
    );

    await act(async () => {
      screen.getByTestId('enable-managed-pipelines-button').click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Confirm' }).click();
      await Promise.resolve();
    });
    unmount();
    await act(async () => {
      resolveEnable?.();
      await Promise.resolve();
    });

    expect(mockReadiness).toHaveBeenLastCalledWith('test-project', config.isTransientError, false);
  });

  it('should not start polling when enable completes after the namespace changes', async () => {
    let resolveEnable: (() => void) | undefined;
    mockEnable.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveEnable = resolve;
      }),
    );
    const { rerender } = render(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="test-project" mode="enable" />
      </MemoryRouter>,
    );

    await act(async () => {
      screen.getByTestId('enable-managed-pipelines-button').click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Confirm' }).click();
      await Promise.resolve();
    });
    rerender(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="other-project" mode="enable" />
      </MemoryRouter>,
    );
    await act(async () => {
      resolveEnable?.();
      await Promise.resolve();
    });

    expect(mockReadiness).toHaveBeenLastCalledWith('other-project', config.isTransientError, false);
  });

  it('should not start polling when enable completes after the mode changes', async () => {
    let resolveEnable: (() => void) | undefined;
    mockEnable.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveEnable = resolve;
      }),
    );
    const { rerender } = render(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="test-project" mode="enable" />
      </MemoryRouter>,
    );

    await act(async () => {
      screen.getByTestId('enable-managed-pipelines-button').click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Confirm' }).click();
      await Promise.resolve();
    });
    rerender(
      <MemoryRouter>
        <PipelineServerSetup config={config} namespace="test-project" mode="configure" />
      </MemoryRouter>,
    );
    await act(async () => {
      resolveEnable?.();
      await Promise.resolve();
    });

    expect(mockReadiness).toHaveBeenLastCalledWith('test-project', config.isTransientError, false);
  });
});
