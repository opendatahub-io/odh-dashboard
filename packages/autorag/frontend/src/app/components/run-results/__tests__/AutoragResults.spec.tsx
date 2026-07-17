/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import {
  AutoragResultsContext,
  type AutoragResultsContextProps,
} from '~/app/context/AutoragResultsContext';
import type { PipelineRun } from '~/app/types';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import * as queries from '~/app/hooks/queries';
import * as treeView from '~/app/topology/tree-view';
import * as transformPipelineDataModule from '~/app/topology/tree-view/transformPipelineData';
import * as buildStageMapTopologyModule from '~/app/topology/buildStageMapTopology';
import * as useAutoragTaskTopologyModule from '~/app/topology/useAutoragTaskTopology';
import * as utils from '~/app/utilities/utils';

jest.mock('~/app/topology/tree-view', () => ({
  useTreeViewData: jest.fn().mockReturnValue({ selectedPattern: undefined, stageMapNodes: [] }),
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

jest.mock('~/app/components/run-results/AutoragPipelineVisualization', () => ({
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
      data-testid="autorag-pipeline-visualization"
      data-run-title={runTitle}
      data-run-state={runState}
      data-tree-loading-mode={treeLoadingMode ?? 'none'}
    />
  ),
}));

jest.mock('~/app/topology/useAutoragTaskTopology', () => ({
  useAutoragTaskTopology: jest.fn().mockReturnValue([{ id: 'task-1' }, { id: 'task-2' }]),
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
  display_name: 'My AutoRAG Run',
  state: 'SUCCEEDED',
  created_at: '2025-06-01T00:00:00Z',
};

const createMockPattern = (name: string): AutoragPattern => ({
  name,
  iteration: 0,
  max_combinations: 20,
  duration_seconds: 120,
  settings: {
    vector_store_binding: {
      provider_id: 'milvus',
      provider_type: 'remote::milvus',
      vector_store_id: 'vs_collection0',
    },
    chunking: {
      method: 'fixed',
      chunk_size: 512,
      chunk_overlap: 50,
    },
    embedding: {
      model_id: 'test-model',
      distance_metric: 'cosine',
      embedding_params: {
        embedding_dimension: 768,
        context_length: 512,
        timeout: null,
        model_type: null,
        provider_id: null,
        provider_resource_id: null,
      },
    },
    retrieval: {
      method: 'similarity',
      number_of_chunks: 5,
    },
    generation: {
      model_id: 'gen-model',
      context_template_text: '',
      user_message_text: '',
      system_message_text: '',
    },
  },
  scores: {
    faithfulness: { mean: 0.9, ci_low: 0.85, ci_high: 0.95 },
  },
  final_score: 0.9,
});

const fetchS3FileMock = jest.mocked(queries.fetchS3File);
const downloadBlobMock = jest.mocked(utils.downloadBlob);
const useTreeViewDataMock = jest.mocked(treeView.useTreeViewData);
const transformPipelineDataMock = jest.mocked(transformPipelineDataModule.transformPipelineData);
const useAutoragTaskTopologyMock = jest.mocked(useAutoragTaskTopologyModule.useAutoragTaskTopology);
const buildStageMapTopologyMock = jest.mocked(buildStageMapTopologyModule.buildStageMapTopology);

const getPipelineVisualization = () => screen.getByTestId('autorag-pipeline-visualization');

describe('AutoragResults', () => {
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
    patterns: Record<string, AutoragPattern> = {},
    namespace = 'test-namespace',
    contextOverrides?: Partial<AutoragResultsContextProps>,
  ) =>
    render(
      <MemoryRouter initialEntries={[`/autorag/${namespace}/results`]}>
        <Routes>
          <Route
            path="/autorag/:namespace/results"
            element={
              <AutoragResultsContext.Provider
                value={{
                  pipelineRun,
                  patterns,
                  parameters: {},
                  ragPatternsBasePath: 'rag_patterns',
                  ...contextOverrides,
                }}
              >
                <AutoragResults />
              </AutoragResultsContext.Provider>
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
    expect(visualization).toHaveAttribute('data-run-title', 'AutoRAG pipeline run');
    expect(visualization).toHaveAttribute('data-run-state', 'SUCCEEDED');
  });

  it('should pass fallback topology nodes to useTreeViewData when stage map is unavailable', () => {
    renderWithContext(mockPipelineRun);
    const fallbackNodes = useAutoragTaskTopologyMock.mock.results[0]?.value;
    expect(useTreeViewDataMock).toHaveBeenCalledWith({}, fallbackNodes, undefined);
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
    expect(useAutoragTaskTopologyMock).toHaveBeenCalledWith(
      pipelineRun.pipeline_spec,
      undefined,
      undefined,
    );
  });

  describe('notebook download error handling', () => {
    it('should display error alert when fetchS3File fails', async () => {
      const testPattern = createMockPattern('Pattern1');
      const patterns = { Pattern1: testPattern };

      fetchS3FileMock.mockRejectedValueOnce(new Error('S3 connection failed'));

      renderWithContext(mockPipelineRun, patterns);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save as indexing notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Pattern: Pattern1')).toBeInTheDocument();
      expect(screen.getByText('S3 connection failed', { exact: false })).toBeInTheDocument();
    });

    it('should display error when namespace is missing', async () => {
      const testPattern = createMockPattern('Pattern1');
      const patterns = { Pattern1: testPattern };

      render(
        <MemoryRouter initialEntries={['/autorag/results']}>
          <Routes>
            <Route
              path="/autorag/results"
              element={
                <AutoragResultsContext.Provider
                  value={{
                    pipelineRun: mockPipelineRun,
                    patterns,
                    parameters: {},
                    ragPatternsBasePath: 'rag_patterns',
                  }}
                >
                  <AutoragResults />
                </AutoragResultsContext.Provider>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save as indexing notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Namespace is not available', { exact: false })).toBeInTheDocument();
    });

    it('should display error when ragPatternsBasePath is missing', async () => {
      const testPattern = createMockPattern('Pattern1');
      const patterns = { Pattern1: testPattern };

      renderWithContext(mockPipelineRun, patterns, 'test-namespace', {
        ragPatternsBasePath: undefined,
      });

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save as indexing notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Pattern base path is not available', { exact: false }),
      ).toBeInTheDocument();
    });

    it('should allow user to dismiss error alert', async () => {
      const testPattern = createMockPattern('Pattern1');
      const patterns = { Pattern1: testPattern };

      fetchS3FileMock.mockRejectedValueOnce(new Error('Network error'));

      renderWithContext(mockPipelineRun, patterns);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save as indexing notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close.*danger.*alert/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Notebook download failed')).not.toBeInTheDocument();
      });
    });

    it('should clear previous error when new download is attempted', async () => {
      const testPattern = createMockPattern('Pattern1');
      const patterns = { Pattern1: testPattern };

      fetchS3FileMock.mockRejectedValueOnce(new Error('First error'));

      renderWithContext(mockPipelineRun, patterns);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save as indexing notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(screen.getByText('First error', { exact: false })).toBeInTheDocument();
      });

      fetchS3FileMock.mockResolvedValueOnce(new Blob(['notebook content'], { type: 'text/plain' }));

      await userEvent.click(kebabButton);
      const saveNotebookAction2 = screen.getByText('Save as indexing notebook');
      await userEvent.click(saveNotebookAction2);

      await waitFor(() => {
        expect(screen.queryByText('First error', { exact: false })).not.toBeInTheDocument();
      });

      expect(downloadBlobMock).toHaveBeenCalled();
    });

    it('should successfully download indexing notebook when all data is valid', async () => {
      const testPattern = createMockPattern('Pattern1');
      const patterns = { Pattern1: testPattern };

      const mockBlob = new Blob(['notebook content'], { type: 'application/x-ipynb+json' });
      fetchS3FileMock.mockResolvedValueOnce(mockBlob);

      renderWithContext(mockPipelineRun, patterns);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save as indexing notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(fetchS3FileMock).toHaveBeenCalledWith(
          'test-namespace',
          'rag_patterns/Pattern1/indexing.ipynb',
        );
        expect(downloadBlobMock).toHaveBeenCalledWith(
          mockBlob,
          'My AutoRAG Run_Pattern1_indexing_notebook.ipynb',
        );
      });

      expect(screen.queryByText('Notebook download failed')).not.toBeInTheDocument();
    });

    it('should successfully download inference notebook when all data is valid', async () => {
      const testPattern = createMockPattern('Pattern1');
      const patterns = { Pattern1: testPattern };

      const mockBlob = new Blob(['notebook content'], { type: 'application/x-ipynb+json' });
      fetchS3FileMock.mockResolvedValueOnce(mockBlob);

      renderWithContext(mockPipelineRun, patterns);

      const leaderboard = screen.getByTestId('leaderboard-table');
      const firstRow = within(leaderboard).getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });

      await userEvent.click(kebabButton);

      const saveNotebookAction = screen.getByText('Save as inference notebook');
      await userEvent.click(saveNotebookAction);

      await waitFor(() => {
        expect(fetchS3FileMock).toHaveBeenCalledWith(
          'test-namespace',
          'rag_patterns/Pattern1/inference.ipynb',
        );
        expect(downloadBlobMock).toHaveBeenCalledWith(
          mockBlob,
          'My AutoRAG Run_Pattern1_inference_notebook.ipynb',
        );
      });
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
              'test-data-loader': { taskInfo: { name: 'test-data-loader' } },
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
              'test-data-loader': { taskInfo: { name: 'test-data-loader' } },
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
        useAutoragTaskTopologyMock.mock.results.at(-1)?.value,
        undefined,
      );
    });

    it('should show hydrating state when patterns are still loading for a terminal run', () => {
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
        patternsLoading: true,
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
        patternsLoading: false,
      });

      expect(getPipelineVisualization()).toHaveAttribute('data-tree-loading-mode', 'none');
      expect(buildStageMapTopologyMock).toHaveBeenCalled();
      expect(useTreeViewDataMock).toHaveBeenCalledWith(
        {},
        buildStageMapTopologyMock.mock.results.at(-1)?.value,
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
        patternsLoading: false,
      });

      expect(useTreeViewDataMock).toHaveBeenCalledWith(
        {},
        useAutoragTaskTopologyMock.mock.results.at(-1)?.value,
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
        useAutoragTaskTopologyMock.mock.results.at(-1)?.value,
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
        useAutoragTaskTopologyMock.mock.results.at(-1)?.value,
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
