/* eslint-disable camelcase */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import {
  AutoragResultsContext,
  type AutoragResultsContextProps,
} from '~/app/context/AutoragResultsContext';
import type { PipelineRun } from '~/app/types';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import * as queries from '~/app/hooks/queries';
import * as utils from '~/app/utilities/utils';

let capturedOnSaveNotebook:
  | ((patternName: string, notebookType: 'indexing' | 'inference') => void)
  | undefined;

let mockNamespace: string | undefined = 'test-ns';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({ namespace: mockNamespace }),
}));

jest.mock('~/app/topology/PipelineTopology', () => ({
  __esModule: true,
  default: ({ nodes, className }: { nodes: unknown[]; className?: string }) => (
    <div data-testid="pipeline-topology" data-node-count={nodes.length} className={className} />
  ),
}));

jest.mock('~/app/topology/useAutoragTaskTopology', () => ({
  useAutoragTaskTopology: jest.fn().mockReturnValue([{ id: 'task-1' }, { id: 'task-2' }]),
}));

jest.mock('~/app/topology/buildStageMapTopology', () => ({
  buildStageMapTopology: jest.fn().mockReturnValue([{ id: 'stage-1' }, { id: 'stage-2' }]),
}));

jest.mock('~/app/components/run-results/AutoragLeaderboard', () => ({
  __esModule: true,
  default: ({
    onSaveNotebook,
  }: {
    onSaveNotebook?: (patternName: string, notebookType: 'indexing' | 'inference') => void;
  }) => {
    capturedOnSaveNotebook = onSaveNotebook;
    return <div data-testid="autorag-leaderboard" />;
  },
}));

jest.mock('~/app/utilities/utils', () => ({
  ...jest.requireActual('~/app/utilities/utils'),
  downloadBlob: jest.fn(),
}));

jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  fetchS3File: jest.fn(),
}));

const fetchS3FileMock = jest.mocked(queries.fetchS3File);
const downloadBlobMock = jest.mocked(utils.downloadBlob);

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
    vector_store: {
      datasource_type: 'milvus',
      collection_name: 'test',
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
    accuracy: { mean: 0.9, ci_low: 0.85, ci_high: 0.95 },
  },
  final_score: 0.9,
});

const defaultContextValue: AutoragResultsContextProps = {
  pipelineRun: mockPipelineRun,
  pipelineRunLoading: false,
  patterns: {},
  patternsLoading: false,
  parameters: {},
  ragPatternsBasePath: 'rag_patterns',
};

const renderWithContext = (contextValue: Partial<AutoragResultsContextProps> = {}) => {
  const value = { ...defaultContextValue, ...contextValue };
  return render(
    <AutoragResultsContext.Provider value={value}>
      <AutoragResults />
    </AutoragResultsContext.Provider>,
  );
};

describe('AutoragResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnSaveNotebook = undefined;
    mockNamespace = 'test-ns';
  });

  it('should render the PipelineTopology component', () => {
    renderWithContext();
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
  });

  it('should render the AutoragLeaderboard component', () => {
    renderWithContext();
    expect(screen.getByTestId('autorag-leaderboard')).toBeInTheDocument();
  });

  it('should pass the autorag-topology-container className to PipelineTopology', () => {
    renderWithContext();
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveClass('autorag-topology-container');
  });

  it('should pass nodes from useAutoragTaskTopology to PipelineTopology', () => {
    renderWithContext();
    const topology = screen.getByTestId('pipeline-topology');
    expect(topology).toHaveAttribute('data-node-count', '2');
  });

  it('should render gracefully when pipelineRun is undefined', () => {
    renderWithContext({ pipelineRun: undefined });
    expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
    expect(screen.getByTestId('autorag-leaderboard')).toBeInTheDocument();
  });

  describe('notebook download', () => {
    it('should successfully download indexing notebook', async () => {
      const patterns = { pattern0: createMockPattern('pattern0') };
      const mockBlob = new Blob(['notebook'], { type: 'application/x-ipynb+json' });
      fetchS3FileMock.mockResolvedValueOnce(mockBlob);

      renderWithContext({ patterns });

      expect(capturedOnSaveNotebook).toBeDefined();
      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'indexing');
      });

      await waitFor(() => {
        expect(fetchS3FileMock).toHaveBeenCalledWith(
          'test-ns',
          'rag_patterns/pattern0/indexing.ipynb',
        );
        expect(downloadBlobMock).toHaveBeenCalledWith(
          mockBlob,
          'My AutoRAG Run_pattern0_indexing_notebook.ipynb',
        );
      });

      expect(screen.queryByText('Notebook download failed')).not.toBeInTheDocument();
    });

    it('should successfully download inference notebook', async () => {
      const patterns = { pattern0: createMockPattern('pattern0') };
      const mockBlob = new Blob(['notebook'], { type: 'application/x-ipynb+json' });
      fetchS3FileMock.mockResolvedValueOnce(mockBlob);

      renderWithContext({ patterns });

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'inference');
      });

      await waitFor(() => {
        expect(fetchS3FileMock).toHaveBeenCalledWith(
          'test-ns',
          'rag_patterns/pattern0/inference.ipynb',
        );
        expect(downloadBlobMock).toHaveBeenCalledWith(
          mockBlob,
          'My AutoRAG Run_pattern0_inference_notebook.ipynb',
        );
      });
    });

    it('should display error alert when fetchS3File fails', async () => {
      const patterns = { pattern0: createMockPattern('pattern0') };
      fetchS3FileMock.mockRejectedValueOnce(new Error('S3 connection failed'));

      renderWithContext({ patterns });

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'indexing');
      });

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Pattern: pattern0')).toBeInTheDocument();
      expect(screen.getByText('S3 connection failed', { exact: false })).toBeInTheDocument();
    });

    it('should display error when namespace is missing', async () => {
      mockNamespace = undefined;
      const patterns = { pattern0: createMockPattern('pattern0') };

      renderWithContext({ patterns });

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'indexing');
      });

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Namespace is not available', { exact: false })).toBeInTheDocument();
    });

    it('should display error when ragPatternsBasePath is missing', async () => {
      const patterns = { pattern0: createMockPattern('pattern0') };

      renderWithContext({ patterns, ragPatternsBasePath: undefined });

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'indexing');
      });

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Pattern base path is not available', { exact: false }),
      ).toBeInTheDocument();
    });

    it('should allow user to dismiss error alert', async () => {
      const patterns = { pattern0: createMockPattern('pattern0') };
      fetchS3FileMock.mockRejectedValueOnce(new Error('Network error'));

      renderWithContext({ patterns });

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'indexing');
      });

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
      const patterns = { pattern0: createMockPattern('pattern0') };
      fetchS3FileMock.mockRejectedValueOnce(new Error('First error'));

      renderWithContext({ patterns });

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'indexing');
      });

      await waitFor(() => {
        expect(screen.getByText('First error', { exact: false })).toBeInTheDocument();
      });

      fetchS3FileMock.mockResolvedValueOnce(new Blob(['notebook'], { type: 'text/plain' }));

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'inference');
      });

      await waitFor(() => {
        expect(screen.queryByText('First error', { exact: false })).not.toBeInTheDocument();
      });

      expect(downloadBlobMock).toHaveBeenCalled();
    });

    it('should handle non-Error thrown objects gracefully', async () => {
      const patterns = { pattern0: createMockPattern('pattern0') };
      fetchS3FileMock.mockRejectedValueOnce('string error');

      renderWithContext({ patterns });

      await act(async () => {
        capturedOnSaveNotebook!('pattern0', 'indexing');
      });

      await waitFor(() => {
        expect(screen.getByText('Notebook download failed')).toBeInTheDocument();
      });

      expect(screen.getByText('An unknown error occurred', { exact: false })).toBeInTheDocument();
    });
  });

  describe('run state label', () => {
    it('should show Canceled label when run state is CANCELED', () => {
      const canceledRun: PipelineRun = {
        ...mockPipelineRun,
        state: 'CANCELED',
      };
      renderWithContext({ pipelineRun: canceledRun });

      expect(screen.getByTestId('run-status-label')).toBeInTheDocument();
      expect(screen.getByTestId('run-status-label')).toHaveTextContent('CANCELED');
    });

    it('should show Failed label when run state is FAILED', () => {
      const failedRun: PipelineRun = {
        ...mockPipelineRun,
        state: 'FAILED',
      };
      renderWithContext({ pipelineRun: failedRun });

      expect(screen.getByTestId('run-status-label')).toBeInTheDocument();
      expect(screen.getByTestId('run-status-label')).toHaveTextContent('FAILED');
    });

    it('should not show state label when run state is SUCCEEDED', () => {
      renderWithContext();

      expect(screen.queryByTestId('run-status-label')).not.toBeInTheDocument();
    });

    it('should not show state label when run state is RUNNING', () => {
      const runningRun: PipelineRun = {
        ...mockPipelineRun,
        state: 'RUNNING',
      };
      renderWithContext({ pipelineRun: runningRun });

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

    it('should show loading spinner when stage map is loading and run is not terminal', () => {
      renderWithContext({
        pipelineRun: stageMapRun,
        componentStageMapLoading: true,
      });

      expect(screen.getByText('Preparing the optimization pipeline')).toBeInTheDocument();
      expect(screen.queryByTestId('pipeline-topology')).not.toBeInTheDocument();
    });

    it('should show loading spinner when stage map is not yet available and run is not terminal', () => {
      renderWithContext({
        pipelineRun: stageMapRun,
        componentStageMapLoading: false,
      });

      expect(screen.getByText('Preparing the optimization pipeline')).toBeInTheDocument();
    });

    it('should show topology with stage map nodes when componentStageMap is available', () => {
      renderWithContext({
        pipelineRun: stageMapRun,
        componentStageMap: mockComponentStageMap,
      });

      expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
      expect(screen.queryByText('Preparing the optimization pipeline')).not.toBeInTheDocument();
    });

    it('should fall back to task topology when pipeline spec lacks publish-component-stage-map task', () => {
      renderWithContext({
        pipelineRun: noStageMapRun,
        componentStageMap: mockComponentStageMap,
      });

      const topology = screen.getByTestId('pipeline-topology');
      expect(topology).toBeInTheDocument();
      expect(topology).toHaveAttribute('data-node-count', '2');
    });

    it('should fall back to task topology when componentStageMapError is truthy', () => {
      renderWithContext({
        pipelineRun: stageMapRun,
        componentStageMap: mockComponentStageMap,
        componentStageMapError: true,
      });

      const topology = screen.getByTestId('pipeline-topology');
      expect(topology).toBeInTheDocument();
      expect(topology).toHaveAttribute('data-node-count', '2');
    });

    it('should show topology (not spinner) when run is terminal even without stage map', () => {
      const terminalStageMapRun: PipelineRun = {
        ...stageMapRun,
        state: 'SUCCEEDED',
      };
      renderWithContext({
        pipelineRun: terminalStageMapRun,
        componentStageMapLoading: false,
      });

      expect(screen.getByTestId('pipeline-topology')).toBeInTheDocument();
      expect(screen.queryByText('Preparing the optimization pipeline')).not.toBeInTheDocument();
    });
  });
});
