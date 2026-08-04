/* eslint-disable camelcase -- PipelineRunsData uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import PipelineServerSetup from '~/app/components/empty-states/PipelineServerSetup';
import { enableManagedPipelines, getPipelineRunsFromBFF } from '~/app/api/pipelines';

jest.mock(
  '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal',
  () => ({
    ConfigurePipelinesServerModal: ({
      onClose,
      onSuccess,
    }: {
      onClose: () => void;
      onSuccess?: () => void;
    }) => (
      <div data-testid="mock-configure-modal">
        <button data-testid="mock-modal-close" onClick={onClose}>
          Close
        </button>
        <button data-testid="mock-modal-submit" onClick={() => onSuccess?.()}>
          Submit
        </button>
      </div>
    ),
  }),
);

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

jest.mock('~/app/api/pipelines', () => ({
  enableManagedPipelines: jest.fn(),
  getPipelineRunsFromBFF: jest.fn(),
}));

const mockEnableManagedPipelines = jest.mocked(enableManagedPipelines);
const mockGetPipelineRunsFromBFF = jest.mocked(getPipelineRunsFromBFF);

describe('PipelineServerSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('mode="configure" (default)', () => {
    it('renders empty state with configure button', () => {
      render(
        <MemoryRouter>
          <PipelineServerSetup />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole('heading', { name: 'Configure a pipeline server' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'To use AutoRAG, configure a pipeline server with AutoRAG pipelines enabled.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByTestId('configure-pipeline-server-button')).toHaveTextContent(
        'Configure pipeline server',
      );
    });

    it('opens the configure modal when the button is clicked', () => {
      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="my-project" />
        </MemoryRouter>,
      );

      expect(screen.queryByTestId('mock-configure-modal')).not.toBeInTheDocument();
      act(() => {
        screen.getByTestId('configure-pipeline-server-button').click();
      });
      expect(screen.getByTestId('mock-configure-modal')).toBeInTheDocument();
    });

    it('closes the modal when onClose is called', () => {
      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="my-project" />
        </MemoryRouter>,
      );

      act(() => {
        screen.getByTestId('configure-pipeline-server-button').click();
      });
      expect(screen.getByTestId('mock-configure-modal')).toBeInTheDocument();

      act(() => {
        screen.getByTestId('mock-modal-close').click();
      });
      expect(screen.queryByTestId('mock-configure-modal')).not.toBeInTheDocument();
    });

    it('shows polling spinner after modal submit', () => {
      const onStarted = jest.fn();

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="my-project" onStarted={onStarted} />
        </MemoryRouter>,
      );

      act(() => {
        screen.getByTestId('configure-pipeline-server-button').click();
      });
      act(() => {
        screen.getByTestId('mock-modal-submit').click();
      });

      expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Starting pipeline server' })).toBeInTheDocument();
      expect(onStarted).toHaveBeenCalled();
    });

    it('calls onReady when polling succeeds', async () => {
      const onReady = jest.fn();
      mockGetPipelineRunsFromBFF.mockResolvedValue({
        runs: [],
        total_size: 0,
        next_page_token: '',
      });

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="my-project" onReady={onReady} />
        </MemoryRouter>,
      );

      act(() => {
        screen.getByTestId('configure-pipeline-server-button').click();
      });
      act(() => {
        screen.getByTestId('mock-modal-submit').click();
      });

      expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(onReady).toHaveBeenCalled();
      // Polling UI stays visible — the parent unmounts this component after its hooks refresh
      expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
    });

    it('keeps polling when server is not ready', async () => {
      const onReady = jest.fn();
      mockGetPipelineRunsFromBFF.mockRejectedValue(
        new Error('pipeline server exists but is not ready'),
      );

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="my-project" onReady={onReady} />
        </MemoryRouter>,
      );

      act(() => {
        screen.getByTestId('configure-pipeline-server-button').click();
      });
      act(() => {
        screen.getByTestId('mock-modal-submit').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(15000);
      });

      expect(onReady).not.toHaveBeenCalled();
      expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
    });

    it('shows error on timeout', async () => {
      const onFailed = jest.fn();
      mockGetPipelineRunsFromBFF.mockRejectedValue(
        new Error('pipeline server exists but is not ready'),
      );

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="my-project" onFailed={onFailed} />
        </MemoryRouter>,
      );

      act(() => {
        screen.getByTestId('configure-pipeline-server-button').click();
      });
      act(() => {
        screen.getByTestId('mock-modal-submit').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });

      expect(screen.queryByTestId('pipeline-server-polling')).not.toBeInTheDocument();
      expect(screen.getByTestId('pipeline-server-error')).toBeInTheDocument();
      expect(
        screen.getByText('Timed out waiting for the pipeline server to become ready.'),
      ).toBeInTheDocument();
      expect(onFailed).toHaveBeenCalled();
    });
  });

  describe('mode="enable"', () => {
    it('renders the enable button in idle state', () => {
      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="enable" />
        </MemoryRouter>,
      );

      expect(screen.getByRole('heading', { name: 'Enable AutoRAG pipelines' })).toBeInTheDocument();
      expect(screen.getByTestId('enable-managed-pipelines-button')).toHaveTextContent(
        'Enable AutoRAG pipelines',
      );
    });

    it('opens modal on button click and calls enableManagedPipelines on confirm', async () => {
      mockEnableManagedPipelines.mockResolvedValue(undefined);

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="enable" />
        </MemoryRouter>,
      );

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

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="enable" />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-confirm'));
      });

      expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
    });

    it('shows error alert when enable fails', async () => {
      mockEnableManagedPipelines.mockRejectedValue(new Error('permission denied'));

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="enable" />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-confirm'));
      });

      expect(screen.getByTestId('managed-pipelines-error')).toBeInTheDocument();
      expect(screen.getByText('permission denied')).toBeInTheDocument();
      expect(screen.getByTestId('enable-managed-pipelines-button')).toBeInTheDocument();
    });

    it('calls onReady when polling succeeds', async () => {
      mockEnableManagedPipelines.mockResolvedValue(undefined);
      mockGetPipelineRunsFromBFF.mockResolvedValue({
        runs: [],
        total_size: 0,
        next_page_token: '',
      });
      const onReady = jest.fn();

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="enable" onReady={onReady} />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-confirm'));
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(onReady).toHaveBeenCalled();
      });
    });

    it('shows error on polling timeout', async () => {
      mockEnableManagedPipelines.mockResolvedValue(undefined);
      mockGetPipelineRunsFromBFF.mockRejectedValue(
        new Error('required managed pipelines not found in namespace'),
      );
      const onFailed = jest.fn();

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="enable" onFailed={onFailed} />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId('enable-managed-pipelines-button'));

      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-confirm'));
      });

      expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });

      expect(screen.getByTestId('managed-pipelines-error')).toBeInTheDocument();
      expect(onFailed).toHaveBeenCalled();
    });
  });

  describe('mode="waiting"', () => {
    it('starts polling immediately on mount', () => {
      mockGetPipelineRunsFromBFF.mockRejectedValue(
        new Error('pipeline server exists but is not ready'),
      );

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="waiting" />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Starting pipeline server' })).toBeInTheDocument();
    });

    it('calls onReady when polling succeeds', async () => {
      const onReady = jest.fn();
      mockGetPipelineRunsFromBFF.mockResolvedValue({
        runs: [],
        total_size: 0,
        next_page_token: '',
      });

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="test-ns" mode="waiting" onReady={onReady} />
        </MemoryRouter>,
      );

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(onReady).toHaveBeenCalled();
    });

    it('shows error state with "View error details" link on timeout', async () => {
      mockGetPipelineRunsFromBFF.mockRejectedValue(
        new Error('pipeline server exists but is not ready'),
      );
      const onFailed = jest.fn();

      render(
        <MemoryRouter>
          <PipelineServerSetup namespace="my-project" mode="waiting" onFailed={onFailed} />
        </MemoryRouter>,
      );

      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });

      expect(screen.getByText('There is a problem with the pipeline server')).toBeInTheDocument();
      const link = screen.getByTestId('go-to-pipelines-link');
      expect(link).toHaveTextContent('View error details');
      const anchor = link.closest('a');
      expect(anchor).toHaveAttribute('href', pipelinesBaseRoute('my-project'));
      expect(onFailed).toHaveBeenCalled();
    });
  });
});
