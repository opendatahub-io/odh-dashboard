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
import * as treeView from '~/app/topology/tree-view';
import * as transformPipelineDataModule from '~/app/topology/tree-view/transformPipelineData';
import * as buildStageMapTopologyModule from '~/app/topology/buildStageMapTopology';
import * as useAutomlTaskTopologyModule from '~/app/topology/useAutomlTaskTopology';
import * as utils from '~/app/utilities/utils';

jest.mock('~/app/topology/tree-view', () => ({
  useTreeViewData: jest.fn().mockReturnValue({ selectedModel: undefined, stageMapNodes: [] }),
}));

jest.mock('~/app/topology/tree-view/transformPipelineData', () => ({
  transformPipelineData: jest.fn((data: { stageMapNodes?: unknown[] }) => {
    if (!data.stageMapNodes || data.stageMapNodes.length === 0) {
      return { status: 'empty', topology: { nodes: [], edges: [] } };
    }
    return { status: 'ok', topology: { nodes: [], edges: [] } };
  }),
  getTreeTopologyFromResult: jest.fn((result: { status: string; topology?: unknown }) =>
    result.status === 'error' ? { nodes: [], edges: [] } : result.topology,
  ),
}));

jest.mock('~/app/components/run-results/AutomlPipelineVisualization', () => ({
  __esModule: true,
  default: ({
    runTitle,
    runState,
    treeLoadingMode,
  }: {
    runTitle: string;
    runState?: string;
    treeLoadingMode?: string;
  }) => (
    <div
      data-testid="automl-pipeline-visualization"
      data-run-title={runTitle}
      data-run-state={runState}
      data-tree-loading-mode={treeLoadingMode ?? 'none'}
    />
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
const useTreeViewDataMock = jest.mocked(treeView.useTreeViewData);
const transformPipelineDataMock = jest.mocked(transformPipelineDataModule.transformPipelineData);
const useAutomlTaskTopologyMock = jest.mocked(useAutomlTaskTopologyModule.useAutomlTaskTopology);
const buildStageMapTopologyMock = jest.mocked(buildStageMapTopologyModule.buildStageMapTopology);

const getPipelineVisualization = () => screen.getByTestId('automl-pipeline-visualization');

describe('AutomlResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transformPipelineDataMock.mockImplementation((data) => {
      if (!data.stageMapNodes || data.stageMapNodes.length === 0) {
        return { status: 'empty', topology: { nodes: [], edges: [] } };
      }
      return { status: 'ok', topology: { nodes: [], edges: [] } };
    });
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

  it('should render the pipeline visualization component', () => {
    renderWithContext(mockPipelineRun);
    expect(getPipelineVisualization()).toBeInTheDocument();
  });

  it('should pass run title and state to the pipeline visualization', () => {
    renderWithContext(mockPipelineRun);
    const visualization = getPipelineVisualization();
    expect(visualization).toHaveAttribute('data-run-title', 'AutoML pipeline run');
    expect(visualization).toHaveAttribute('data-run-state', 'SUCCEEDED');
  });

  it('should pass fallback topology nodes to useTreeViewData when stage map is unavailable', () => {
    renderWithContext(mockPipelineRun);
    const fallbackNodes = useAutomlTaskTopologyMock.mock.results[0]?.value;
    expect(useTreeViewDataMock).toHaveBeenCalledWith({}, fallbackNodes, undefined, undefined);
  });

  it('should render gracefully when pipelineRun is undefined', () => {
    renderWithContext();
    expect(getPipelineVisualization()).toBeInTheDocument();
    expect(getPipelineVisualization()).not.toHaveAttribute('data-run-state');
  });

  it('should render when pipelineRun.state is a non-string runtime value', () => {
    const pipelineRun = {
      ...mockPipelineRun,
      state: 0 as unknown as PipelineRun['state'],
    };

    renderWithContext(pipelineRun);

    expect(getPipelineVisualization()).toBeInTheDocument();
    expect(getPipelineVisualization()).not.toHaveAttribute('data-run-state');
    expect(useAutomlTaskTopologyMock).toHaveBeenCalledWith(
      pipelineRun.pipeline_spec,
      undefined,
      undefined,
    );
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

  describe('run state wiring', () => {
    it('should pass canceled run state to the pipeline visualization', () => {
      renderWithContext({ ...mockPipelineRun, state: 'CANCELED' });
      expect(getPipelineVisualization()).toHaveAttribute('data-run-state', 'CANCELED');
    });

    it('should pass failed run state to the pipeline visualization', () => {
      renderWithContext({ ...mockPipelineRun, state: 'FAILED' });
      expect(getPipelineVisualization()).toHaveAttribute('data-run-state', 'FAILED');
    });

    it('should pass succeeded run state to the pipeline visualization', () => {
      renderWithContext(mockPipelineRun);
      expect(getPipelineVisualization()).toHaveAttribute('data-run-state', 'SUCCEEDED');
    });

    it('should pass running run state to the pipeline visualization', () => {
      renderWithContext({ ...mockPipelineRun, state: 'RUNNING' });
      expect(getPipelineVisualization()).toHaveAttribute('data-run-state', 'RUNNING');
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

    it('should show preparing state when stage map is loading and run is not terminal', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMapLoading: true,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'preparing');
    });

    it('should show preparing state when stage map is not yet available and run is not terminal', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMapLoading: false,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'preparing');
    });

    it('should not show preparing when component stage map is available before publication succeeds', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
        componentStageMapLoading: false,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'none');
    });

    it('should show hydrating state when stage map is published but merged map is still loading', () => {
      const publishedStageMapRun: PipelineRun = {
        ...stageMapRun,
        run_details: {
          task_details: [
            {
              display_name: 'publish-component-stage-map',
              task_id: 'publish-component-stage-map',
              state: 'SUCCEEDED',
            },
          ],
        } as unknown as PipelineRun['run_details'],
      };

      renderWithContext(publishedStageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
        componentStageMapLoading: true,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'hydrating');
    });

    it('should fall back to task topology when stage map fetch completes without a map', () => {
      const publishedStageMapRun: PipelineRun = {
        ...stageMapRun,
        run_details: {
          task_details: [
            {
              display_name: 'publish-component-stage-map',
              task_id: 'publish-component-stage-map',
              state: 'SUCCEEDED',
            },
          ],
        } as unknown as PipelineRun['run_details'],
      };

      renderWithContext(publishedStageMapRun, {}, 'test-namespace', {
        componentStageMapLoading: false,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'none');
      expect(useTreeViewDataMock).toHaveBeenCalledWith(
        {},
        useAutomlTaskTopologyMock.mock.results.at(-1)?.value,
        undefined,
        undefined,
      );
    });

    it('should show hydrating state when models are still loading for a terminal run', () => {
      const publishedStageMapRun: PipelineRun = {
        ...stageMapRun,
        state: 'SUCCEEDED',
        run_details: {
          task_details: [
            {
              display_name: 'publish-component-stage-map',
              task_id: 'publish-component-stage-map',
              state: 'SUCCEEDED',
            },
          ],
        } as unknown as PipelineRun['run_details'],
      };

      renderWithContext(publishedStageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
        componentStageMapLoading: false,
        modelsLoading: true,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'hydrating');
    });

    it('should show visualization with stage map nodes when componentStageMap is available', () => {
      const publishedStageMapRun: PipelineRun = {
        ...stageMapRun,
        run_details: {
          task_details: [
            {
              display_name: 'publish-component-stage-map',
              task_id: 'publish-component-stage-map',
              state: 'SUCCEEDED',
            },
          ],
        } as unknown as PipelineRun['run_details'],
      };

      renderWithContext(publishedStageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
        componentStageMapLoading: false,
        modelsLoading: false,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'none');
      expect(buildStageMapTopologyMock).toHaveBeenCalled();
      expect(useTreeViewDataMock).toHaveBeenCalledWith(
        {},
        buildStageMapTopologyMock.mock.results.at(-1)?.value,
        undefined,
        undefined,
      );
    });

    it('should fall back to task topology when stage map transform fails', () => {
      transformPipelineDataMock.mockReturnValue({
        status: 'error',
        error: new Error('layout failed'),
      });

      const publishedStageMapRun: PipelineRun = {
        ...stageMapRun,
        run_details: {
          task_details: [
            {
              display_name: 'publish-component-stage-map',
              task_id: 'publish-component-stage-map',
              state: 'SUCCEEDED',
            },
          ],
        } as unknown as PipelineRun['run_details'],
      };

      renderWithContext(publishedStageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
        componentStageMapLoading: false,
        modelsLoading: false,
      });

      expect(useTreeViewDataMock).toHaveBeenCalledWith(
        {},
        useAutomlTaskTopologyMock.mock.results.at(-1)?.value,
        undefined,
        undefined,
      );
    });

    it('should fall back to task topology when pipeline spec lacks publish-component-stage-map task', () => {
      renderWithContext(noStageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'none');
      expect(useTreeViewDataMock).toHaveBeenCalledWith(
        {},
        useAutomlTaskTopologyMock.mock.results.at(-1)?.value,
        undefined,
        undefined,
      );
    });

    it('should fall back to task topology when componentStageMapError is truthy', () => {
      renderWithContext(stageMapRun, {}, 'test-namespace', {
        componentStageMap: mockComponentStageMap,
        componentStageMapError: true,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'none');
      expect(useTreeViewDataMock).toHaveBeenCalledWith(
        {},
        useAutomlTaskTopologyMock.mock.results.at(-1)?.value,
        undefined,
        undefined,
      );
    });

    it('should show visualization when run is terminal even without stage map', () => {
      const terminalStageMapRun: PipelineRun = {
        ...stageMapRun,
        state: 'SUCCEEDED',
      };
      renderWithContext(terminalStageMapRun, {}, 'test-namespace', {
        componentStageMapLoading: false,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'none');
      expect(getPipelineVisualization()).toHaveAttribute('data-run-state', 'SUCCEEDED');
    });
  });
});
