/* eslint-disable camelcase */
import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';
import { RuntimeStateKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineRunType } from '#~/pages/pipelines/global/runs/types';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import PipelineRunTable from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';

// Mock the heavy hooks used by PipelineRunTable
jest.mock('#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable');
jest.mock('#~/concepts/mlflow/hooks/useMlflowExperiments');
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(() => ({
    namespace: 'test-namespace',
    refreshAllAPI: jest.fn(),
    api: {
      updatePipelineRecurringRun: jest.fn(),
    },
    getRecurringRunInformation: jest.fn(() => ({ data: null, loading: false })),
  })),
}));

// Mock usePipelineFilterSearchParams - it uses useSearchParams internally
jest.mock('#~/concepts/pipelines/content/tables/usePipelineFilter', () => ({
  ...jest.requireActual('#~/concepts/pipelines/content/tables/usePipelineFilter'),
  usePipelineFilterSearchParams: jest.fn(() => ({
    onClearFilters: jest.fn(),
    filterData: {},
    onFilterUpdate: jest.fn(),
  })),
}));

// Mock useMetricColumns - it uses MLMD hooks
jest.mock('#~/concepts/pipelines/content/tables/pipelineRun/useMetricColumns', () => ({
  useMetricColumns: jest.fn((runs: unknown[]) => ({
    runs: (runs as Array<Record<string, unknown>>).map((r) => ({ ...r, metrics: [] })),
    metricsColumnNames: [],
    runArtifactsLoaded: true,
    runArtifactsError: undefined,
    contextsError: undefined,
    metricsNames: new Set<string>(),
  })),
}));

// Mock hooks used by PipelineRunTableRow
jest.mock('#~/concepts/pipelines/content/tables/usePipelineRunVersionInfo', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    version: undefined,
    loaded: true,
    error: undefined,
  })),
}));
jest.mock('#~/concepts/pipelines/content/tables/usePipelineRunExperimentInfo', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    experiment: undefined,
    loaded: true,
    error: undefined,
  })),
}));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  useIsAreaAvailable: jest.fn(() => ({
    status: false,
    devFlags: {},
    featureFlags: {},
    reliantAreas: {},
    requiredComponents: {},
    requiredCapabilities: {},
    customCondition: () => false,
  })),
  SupportedArea: {
    MODEL_REGISTRY: 'model-registry',
    MLFLOW: 'mlflow',
    MLFLOW_PIPELINES: 'mlflow-pipelines',
  },
}));
jest.mock('#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/useFetchRunArtifact', () => ({
  useFetchRunArtifact: jest.fn(() => [[], true, undefined]),
}));

// Mock analytics tracking
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

// Mock useNotification (requires Redux store)
jest.mock('#~/utilities/useNotification', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  })),
}));

// Typed access to mock
const useIsMlflowPipelinesAvailable = jest.requireMock(
  '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable',
);
const useMlflowExperiments = jest.requireMock('#~/concepts/mlflow/hooks/useMlflowExperiments');

const defaultProps: React.ComponentProps<typeof PipelineRunTable> = {
  runs: [],
  loading: false,
  totalSize: 0,
  page: 1,
  pageSize: 10,
  setPage: jest.fn(),
  setPageSize: jest.fn(),
  sortField: 'created_at',
  sortDirection: 'desc',
  setSortField: jest.fn(),
  setSortDirection: jest.fn(),
  setFilter: jest.fn(),
  runType: PipelineRunType.ACTIVE,
};

const renderTable = (props: Partial<React.ComponentProps<typeof PipelineRunTable>> = {}) =>
  render(
    <BrowserRouter>
      <ExperimentContext.Provider value={{ experiment: null, basePath: '' }}>
        <PipelineRunExperimentsContext.Provider
          value={{ experiments: [], loaded: true, error: undefined }}
        >
          <PipelineRunVersionsContext.Provider
            value={{ versions: [], loaded: true, error: undefined }}
          >
            <PipelineRunTable {...defaultProps} {...props} />
          </PipelineRunVersionsContext.Provider>
        </PipelineRunExperimentsContext.Provider>
      </ExperimentContext.Provider>
    </BrowserRouter>,
  );

describe('PipelineRunTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMlflowPipelinesAvailable.default.mockReturnValue({
      available: false,
      loaded: true,
      error: undefined,
    });
    useMlflowExperiments.default.mockReturnValue({
      data: [],
      loaded: true,
    });
  });

  describe('MLflow column visibility', () => {
    it('should hide the MLflow experiment column when MLflow is not available', () => {
      useIsMlflowPipelinesAvailable.default.mockReturnValue({
        available: false,
        loaded: true,
        error: undefined,
      });

      renderTable();

      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map((h) => h.textContent);
      expect(headerTexts).not.toContain('MLflow experiment');
    });

    it('should show the MLflow experiment column when MLflow is available', () => {
      useIsMlflowPipelinesAvailable.default.mockReturnValue({
        available: true,
        loaded: true,
        error: undefined,
      });

      renderTable();

      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map((h) => h.textContent);
      expect(headerTexts).toContain('MLflow experiment');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no active runs are provided', () => {
      renderTable({ runs: [], totalSize: 0, runType: PipelineRunType.ACTIVE });

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should show empty state when no archived runs are provided', () => {
      renderTable({ runs: [], totalSize: 0, runType: PipelineRunType.ARCHIVED });

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('table rendering', () => {
    it('should render table rows when runs are provided', () => {
      const mockRuns = [
        buildMockRunKF({
          display_name: 'Test active run 1',
          run_id: 'run-1',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-version-1',
          },
          experiment_id: 'test-experiment-1',
          created_at: '2024-02-01T00:00:00Z',
          state: RuntimeStateKF.RUNNING,
        }),
        buildMockRunKF({
          display_name: 'Test active run 2',
          run_id: 'run-2',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline',
            pipeline_version_id: 'test-version-2',
          },
          experiment_id: 'test-experiment-2',
          created_at: '2024-02-05T00:00:00Z',
          state: RuntimeStateKF.SUCCEEDED,
        }),
      ];

      renderTable({ runs: mockRuns, totalSize: mockRuns.length });

      expect(screen.getByText('Test active run 1')).toBeInTheDocument();
      expect(screen.getByText('Test active run 2')).toBeInTheDocument();
    });

    it('should display the retry start time instead of created_at for a retried run', () => {
      const retriedRun = buildMockRunKF({
        display_name: 'Retried run',
        run_id: 'retried-run-1',
        pipeline_version_reference: {
          pipeline_id: 'test-pipeline',
          pipeline_version_id: 'test-version-1',
        },
        experiment_id: 'test-experiment-1',
        created_at: '2024-01-01T00:00:00Z',
        scheduled_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-02T11:00:00Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          { update_time: '2024-01-01T00:00:01Z', state: 'PENDING' },
          { update_time: '2024-01-01T00:00:05Z', state: 'RUNNING' },
          { update_time: '2024-01-01T01:00:00Z', state: 'FAILED' },
          { update_time: '2024-01-02T10:00:00Z', state: 'PENDING' },
          { update_time: '2024-01-02T10:00:05Z', state: 'RUNNING' },
          { update_time: '2024-01-02T11:00:00Z', state: 'SUCCEEDED' },
        ],
      });

      renderTable({ runs: [retriedRun], totalSize: 1 });

      // The retried run should show the retry start time (2024-01-02) instead of created_at (2024-01-01)
      const timeElements = document.querySelectorAll('time');
      const startedTimeElement = Array.from(timeElements).find((el) => {
        const datetime = el.getAttribute('datetime');
        return datetime && datetime.includes('2024-01-02');
      });
      expect(startedTimeElement).toBeTruthy();
    });
  });
});
