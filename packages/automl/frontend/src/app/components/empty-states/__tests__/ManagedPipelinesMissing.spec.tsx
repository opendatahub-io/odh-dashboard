/* eslint-disable camelcase -- BFF API uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ManagedPipelinesMissing from '~/app/components/empty-states/ManagedPipelinesMissing';
import { enableManagedPipelines, getPipelineRunsFromBFF } from '~/app/api/pipelines';

jest.mock('~/app/api/pipelines', () => ({
  enableManagedPipelines: jest.fn(),
  getPipelineRunsFromBFF: jest.fn(),
}));

jest.mock('~/app/components/empty-states/EnableManagedPipelinesModal', () => {
  const MockEnableManagedPipelinesModal = ({
    onConfirm,
    onClose,
  }: {
    onConfirm: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="enable-modal">
      <button data-testid="modal-confirm" onClick={onConfirm}>
        Confirm
      </button>
      <button data-testid="modal-cancel" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
  MockEnableManagedPipelinesModal.displayName = 'MockEnableManagedPipelinesModal';
  return { __esModule: true, default: MockEnableManagedPipelinesModal };
});

const mockEnableManagedPipelines = jest.mocked(enableManagedPipelines);
const mockGetPipelineRunsFromBFF = jest.mocked(getPipelineRunsFromBFF);

describe('ManagedPipelinesMissing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the enable button in idle state', () => {
    render(<ManagedPipelinesMissing namespace="test-ns" onEnabled={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Enable AutoML pipelines' })).toBeInTheDocument();
    expect(screen.getByTestId('enable-managed-pipelines-button')).toHaveTextContent(
      'Enable AutoML pipelines',
    );
  });

  it('opens modal on button click and calls enableManagedPipelines on confirm', async () => {
    mockEnableManagedPipelines.mockResolvedValue(undefined);
    const onEnabled = jest.fn();

    render(<ManagedPipelinesMissing namespace="test-ns" onEnabled={onEnabled} />);

    fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));
    expect(screen.getByTestId('enable-modal')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });

    expect(mockEnableManagedPipelines).toHaveBeenCalledWith('', 'test-ns');
  });

  it('shows polling state after successful enable', async () => {
    mockEnableManagedPipelines.mockResolvedValue(undefined);
    mockGetPipelineRunsFromBFF.mockRejectedValue(
      new Error('required managed pipelines not found in namespace'),
    );

    render(<ManagedPipelinesMissing namespace="test-ns" onEnabled={jest.fn()} />);

    fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });

    expect(screen.getByTestId('managed-pipelines-polling')).toBeInTheDocument();
  });

  it('shows error alert when enable fails', async () => {
    mockEnableManagedPipelines.mockRejectedValue(new Error('permission denied'));

    render(<ManagedPipelinesMissing namespace="test-ns" onEnabled={jest.fn()} />);

    fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });

    expect(screen.getByTestId('managed-pipelines-error')).toBeInTheDocument();
    expect(screen.getByText('permission denied')).toBeInTheDocument();
    expect(screen.getByTestId('enable-managed-pipelines-button')).toBeInTheDocument();
  });

  it('calls onEnabled when polling succeeds', async () => {
    mockEnableManagedPipelines.mockResolvedValue(undefined);
    mockGetPipelineRunsFromBFF.mockResolvedValue({
      runs: [],
      total_size: 0,
      next_page_token: '',
    });
    const onEnabled = jest.fn();

    render(<ManagedPipelinesMissing namespace="test-ns" onEnabled={onEnabled} />);

    fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(onEnabled).toHaveBeenCalled();
    });
  });

  it('resets to idle on polling timeout', async () => {
    mockEnableManagedPipelines.mockResolvedValue(undefined);
    mockGetPipelineRunsFromBFF.mockRejectedValue(
      new Error('required managed pipelines not found in namespace'),
    );

    render(<ManagedPipelinesMissing namespace="test-ns" onEnabled={jest.fn()} />);

    fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });

    expect(screen.getByTestId('managed-pipelines-polling')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });

    expect(screen.getByTestId('enable-managed-pipelines-button')).toBeInTheDocument();
  });
});
