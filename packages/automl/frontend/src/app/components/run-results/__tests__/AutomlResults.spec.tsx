/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AutomlResults from '~/app/components/run-results/AutomlResults';
import {
  AutomlResultsContext,
  type AutomlModel,
  type AutomlResultsContextProps,
} from '~/app/context/AutomlResultsContext';
import type { PipelineRun } from '~/app/types';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import * as queries from '~/app/hooks/queries';
import * as utils from '~/app/utilities/utils';

jest.mock('~/app/topology/PipelineTopology', () => ({
  __esModule: true,
  default: ({ nodes, className }: { nodes: unknown[]; className?: string }) => (
    <div data-testid="pipeline-topology" data-node-count={nodes.length} className={className} />
  ),
}));

jest.mock('~/app/topology/useAutomlTaskTopology', () => ({
  useAutomlTaskTopology: jest.fn().mockReturnValue([{ id: 'task-1' }, { id: 'task-2' }]),
}));

jest.mock('~/app/topology/buildStageMapTopology', () => ({
  buildStageMapTopology: jest.fn().mockReturnValue([{ id: 'stage-1' }, { id: 'stage-2' }]),
}));

jest.mock('~/app/utilities/utils', () => ({
  ...jest.requireActual('~/app/utilities/utils'),
  downloadBlob: jest.fn(),
}));

jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  fetchS3File: jest.fn(),
}));

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'My AutoML Run',
  state: 'SUCCEEDED',
  created_at: '2025-06-01T00:00:00Z',
};

const createMockModel = (modelName: string): AutomlModel => ({
  name: modelName,
  location: {
    model_directory: `/models/${modelName}`,
    predictor: `/models/${modelName}/predictor`,
    notebook: `/models/${modelName}/notebook.ipynb`,
  },
  metrics: {
    test_data: { accuracy: 0.95 },
  },
});

const fetchS3FileMock = jest.mocked(queries.fetchS3File);
const downloadBlobMock = jest.mocked(utils.downloadBlob);

describe('AutomlResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithContext = (
    pipelineRun?: PipelineRun,
    models: Record<string, AutomlModel> = {},
    namespace = 'test-namespace',
    contextOverrides?: Partial<AutomlResultsContextProps>,
  ) =>
    render(
      <MemoryRouter initialEntries={[`/automl/${namespace}/results`]}>
        <Routes>
          <Route
            path="/automl/:namespace/results"
            element={
              <AutomlResultsContext.Provider
                value={{
                  pipelineRun,
                  models,
                  parameters: { task_type: 'timeseries', label_column: '' },
                  ...contextOverrides,
                }}
              >
                <AutomlResults />
              </AutomlResultsContext.Provider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

  it('should render the PipelineTopology component', () => {
    renderWithContext(mockPipelineRun);
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  it('should pass the automl-topology-container className to PipelineTopology', () => {
    renderWithContext(mockPipelineRun);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveClass('automl-topology-container');
  });

  it('should pass nodes from useAutomlTaskTopology to PipelineTopology', () => {
    renderWithContext(mockPipelineRun);
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveAttribute('data-node-count', '2');
  });

  it('should render gracefully when pipelineRun is undefined', () => {
    renderWithContext();
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  describe('notebook download error handling', () => {
    it('should display error alert when fetchS3File fails', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match name

      fetchS3FileMock.mockRejectedValueOnce(new Error('S3 connection failed'));

      renderWithContext(mockPipelineRun, models);

      // Get the leaderboard component and trigger save notebook
      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      // Wait for error alert to appear
      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Model: Test Model')).toBeInTheDocument();
      expect(screen.getByText('S3 connection failed', { exact: false })).toBeInTheDocument();
    });

    it('should display error when namespace is missing', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match name

      // Render without namespace in the route
      render(
        <MemoryRouter initialEntries={['/automl/results']}>
          <Routes>
            <Route
              path="/automl/results"
              element={
                <AutomlResultsContext.Provider
                  value={{
                    pipelineRun: mockPipelineRun,
                    models,
                    parameters: { task_type: 'timeseries', label_column: '' },
                  }}
                >
                  <AutomlResults />
                </AutomlResultsContext.Provider>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Namespace is not available', { exact: false })).toBeInTheDocument();
    });

    it('should display error when notebook location is missing', async () => {
      const testModel: AutomlModel = {
        ...createMockModel('Test Model'),
        location: {
          model_directory: '/models/Test Model',
          predictor: '/models/Test Model/predictor',
          notebook: '', // Missing notebook location
        },
      };
      const models = { 'Test Model': testModel }; // Key must match name

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Notebook location is not available', { exact: false }),
      ).toBeInTheDocument();
    });

    it('should allow user to dismiss error alert', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match name

      fetchS3FileMock.mockRejectedValueOnce(new Error('Network error'));

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      // Wait for error alert to appear
      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByRole('button', { name: /close.*danger.*alert/i });
      await userEvent.click(closeButton);

      // Alert should be removed
      await waitFor(() => {
        expect(screen.queryByText('Notebook download failed')).not.toBeInTheDocument();
      });
    });

    it('should clear previous error when new download is attempted', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match name

      // First download fails
      fetchS3FileMock.mockRejectedValueOnce(new Error('First error'));

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      // Wait for first error
      await waitFor(() => {
        expect(screen.getByText('First error', { exact: false })).toBeInTheDocument();
      });

      // Second download succeeds
      fetchS3FileMock.mockResolvedValueOnce(new Blob(['notebook content'], { type: 'text/plain' }));

      // Click save notebook again
      await userEvent.click(kebabButton);
      const saveNotebookAction2 = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction2);

      // First error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('First error', { exact: false })).not.toBeInTheDocument();
      });

      // Download should succeed
      expect(downloadBlobMock).toHaveBeenCalled();
    });

    it('should successfully download notebook when all data is valid', async () => {
      const testModel = createMockModel('Test Model');
      const models = { 'Test Model': testModel }; // Key must match name

      const mockBlob = new Blob(['notebook content'], { type: 'application/x-ipynb+json' });
      fetchS3FileMock.mockResolvedValueOnce(mockBlob);

      renderWithContext(mockPipelineRun, models);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(fetchS3FileMock).toHaveBeenCalledWith(
          'test-namespace',
          '/models/Test Model/notebook.ipynb',
        );
        expect(downloadBlobMock).toHaveBeenCalledWith(
          mockBlob,
          'My AutoML Run_Test Model_notebook.ipynb',
        );
      });

      // No error should be shown
      expect(screen.queryByText('Notebook download failed')).not.toBeInTheDocument();
    });
  });

  describe('run state label', () => {
    it('should show state label when run state is CANCELED', () => {
      const canceledRun: PipelineRun = {
        ...mockPipelineRun,
        state: 'CANCELED',
      };
      renderWithContext(canceledRun);

      expect(screen.getByTestId('run-status-label')).toBeInTheDocument();
      expect(screen.getByTestId('run-status-label')).toHaveTextContent('CANCELED');
    });

    it('should show state label when run state is FAILED', () => {
      const failedRun: PipelineRun = {
        ...mockPipelineRun,
        state: 'FAILED',
      };
      renderWithContext(failedRun);

      expect(screen.getByTestId('run-status-label')).toBeInTheDocument();
      expect(screen.getByTestId('run-status-label')).toHaveTextContent('FAILED');
    });

    it('should not show state label when run state is SUCCEEDED', () => {
      renderWithContext(mockPipelineRun);

      expect(screen.queryByTestId('run-status-label')).not.toBeInTheDocument();
    });

    it('should not show state label when run state is RUNNING', () => {
      const runningRun: PipelineRun = {
        ...mockPipelineRun,
        state: 'RUNNING',
      };
      renderWithContext(runningRun);

      expect(screen.queryByTestId('run-status-label')).not.toBeInTheDocument();
    });
  });

  describe('stage map vs fallback topology', () => {
    const stageMapRun: PipelineRun = {
      ...mockPipelineRun,
      state: 'RUNNING',
      pipeline_spec: {
        root: {
          dag: {
            tasks: {
              'publish-component-stage-map': { taskInfo: { name: 'publish-component-stage-map' } },
              'data-preparation': { taskInfo: { name: 'data-preparation' } },
            },
          },
        },
      } as unknown as PipelineRun['pipeline_spec'],
    };

    const noStageMapRun: PipelineRun = {
      ...mockPipelineRun,
      pipeline_spec: {
        root: {
          dag: {
            tasks: {
              'data-preparation': { taskInfo: { name: 'data-preparation' } },
            },
          },
        },
      } as unknown as PipelineRun['pipeline_spec'],
    };

    const mockComponentStageMap: ComponentStageMap = {
      pipeline_id: 'pipeline-1',
      description: 'test',
      components: [],
      kfp_run_id: 'run-1',
      published_at: '2025-01-01T00:00:00Z',
    };

    it('should show loading spinner when stage map is loading and run is not terminal', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMapLoading: true,
      });

      expect(screen.getByText('Preparing the optimization pipeline')).toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-topology')).not.toBeInTheDocument();
    });

    it('should show loading spinner when stage map is not yet available and run is not terminal', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMapLoading: false,
      });

      expect(screen.getByText('Preparing the optimization pipeline')).toBeInTheDocument();
    });

    it('should show topology with stage map nodes when componentStageMap is available', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
      });

      expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
      expect(screen.queryByText('Preparing the optimization pipeline')).not.toBeInTheDocument();
    });

    it('should fall back to task topology when pipeline spec lacks publish-component-stage-map task', () => {
      renderWithContext(noStageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
      });

      const topology = screen.getByTestId('pipeline-topology');
      expect(topology).toBeInTheDocument();
      // Fallback uses useAutomlTaskTopology which returns 2 nodes
      expect(topology).toHaveAttribute('data-node-count', '2');
    });

    it('should fall back to task topology when componentStageMapError is truthy', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
        componentStageMapError: true,
      });

      const topology = screen.getByTestId('pipeline-topology');
      expect(topology).toBeInTheDocument();
      // Falls back to useAutomlTaskTopology (2 nodes)
      expect(topology).toHaveAttribute('data-node-count', '2');
    });

    it('should show topology (not spinner) when run is terminal even without stage map', () => {
      const terminalStageMapRun: PipelineRun = {
        ...stageMapRun,
        state: 'SUCCEEDED',
      };
      renderWithContext(terminalStageMapRun, {}, 'test-namespace', {
        componentStageMapLoading: false,
      });

      expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
      expect(screen.queryByText('Preparing the optimization pipeline')).not.toBeInTheDocument();
    });
  });
});
