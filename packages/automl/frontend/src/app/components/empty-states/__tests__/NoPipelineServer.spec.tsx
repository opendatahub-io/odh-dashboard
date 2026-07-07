/* eslint-disable camelcase -- PipelineRunsData uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';
import { getPipelineRunsFromBFF } from '~/app/api/pipelines';

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

jest.mock('~/app/api/pipelines', () => ({
  getPipelineRunsFromBFF: jest.fn(),
}));

const mockGetPipelineRunsFromBFF = jest.mocked(getPipelineRunsFromBFF);

describe('NoPipelineServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders empty state with configure button', () => {
    render(
      <MemoryRouter>
        <NoPipelineServer />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Configure a pipeline server' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('To use AutoML, configure a pipeline server with AutoML pipelines enabled.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('configure-pipeline-server-button')).toHaveTextContent(
      'Configure pipeline server',
    );
  });

  it('opens the configure modal when the button is clicked', () => {
    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" />
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
        <NoPipelineServer namespace="my-project" />
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
    const onConfigureStarted = jest.fn();

    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" onConfigureStarted={onConfigureStarted} />
      </MemoryRouter>,
    );

    act(() => {
      screen.getByTestId('configure-pipeline-server-button').click();
    });
    act(() => {
      screen.getByTestId('mock-modal-submit').click();
    });

    expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
    expect(
      screen.getByText('Waiting for the pipeline server to become ready...'),
    ).toBeInTheDocument();
    expect(onConfigureStarted).toHaveBeenCalled();
  });

  it('calls onServerConfigured when polling succeeds', async () => {
    const onServerConfigured = jest.fn();
    mockGetPipelineRunsFromBFF.mockResolvedValue({ runs: [], total_size: 0, next_page_token: '' });

    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" onServerConfigured={onServerConfigured} />
      </MemoryRouter>,
    );

    act(() => {
      screen.getByTestId('configure-pipeline-server-button').click();
    });
    act(() => {
      screen.getByTestId('mock-modal-submit').click();
    });

    expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();

    // Advance to first poll
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(onServerConfigured).toHaveBeenCalled();
    expect(screen.queryByTestId('pipeline-server-polling')).not.toBeInTheDocument();
  });

  it('keeps polling when server is not ready', async () => {
    const onServerConfigured = jest.fn();
    mockGetPipelineRunsFromBFF.mockRejectedValue(
      new Error('pipeline server exists but is not ready'),
    );

    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" onServerConfigured={onServerConfigured} />
      </MemoryRouter>,
    );

    act(() => {
      screen.getByTestId('configure-pipeline-server-button').click();
    });
    act(() => {
      screen.getByTestId('mock-modal-submit').click();
    });

    // Advance through a few polls
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(onServerConfigured).not.toHaveBeenCalled();
    expect(screen.getByTestId('pipeline-server-polling')).toBeInTheDocument();
  });

  it('shows error on timeout', async () => {
    mockGetPipelineRunsFromBFF.mockRejectedValue(
      new Error('pipeline server exists but is not ready'),
    );

    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" />
      </MemoryRouter>,
    );

    act(() => {
      screen.getByTestId('configure-pipeline-server-button').click();
    });
    act(() => {
      screen.getByTestId('mock-modal-submit').click();
    });

    // Advance past timeout (120s)
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });

    expect(screen.queryByTestId('pipeline-server-polling')).not.toBeInTheDocument();
    expect(screen.getByTestId('pipeline-server-error')).toBeInTheDocument();
    expect(
      screen.getByText('Timed out waiting for the pipeline server to become ready.'),
    ).toBeInTheDocument();
  });
});
