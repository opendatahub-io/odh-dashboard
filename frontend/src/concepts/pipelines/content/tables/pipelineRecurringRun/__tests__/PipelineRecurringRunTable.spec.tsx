/* eslint-disable camelcase */
import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { buildMockRecurringRunKF } from '#~/__mocks__/mockRecurringRunKF';
import { buildMockExperimentKF } from '#~/__mocks__/mockExperimentKF';
import {
  RecurringRunStatus as RecurringRunStatusType,
  StorageStateKF,
} from '#~/concepts/pipelines/kfTypes';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import PipelineRecurringRunTable from '#~/concepts/pipelines/content/tables/pipelineRecurringRun/PipelineRecurringRunTable';

// Mock the heavy hooks used by PipelineRecurringRunTable
jest.mock('#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable');
jest.mock('#~/concepts/mlflow/hooks/useMlflowExperiments');
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(() => ({
    namespace: 'test-namespace',
    refreshAllAPI: jest.fn(),
    api: {
      updatePipelineRecurringRun: jest.fn().mockResolvedValue(undefined),
    },
    getRecurringRunInformation: jest.fn(() => ({ data: null, loading: false })),
  })),
}));

// Mock usePipelineFilterSearchParams
jest.mock('#~/concepts/pipelines/content/tables/usePipelineFilter', () => ({
  ...jest.requireActual('#~/concepts/pipelines/content/tables/usePipelineFilter'),
  usePipelineFilterSearchParams: jest.fn(() => ({
    onClearFilters: jest.fn(),
    filterData: {},
    onFilterUpdate: jest.fn(),
  })),
}));

// Mock hooks used by PipelineRecurringRunTableRow
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

// Typed access to mocks
const useIsMlflowPipelinesAvailable = jest.requireMock(
  '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable',
);
const useMlflowExperiments = jest.requireMock('#~/concepts/mlflow/hooks/useMlflowExperiments');
const usePipelineRunExperimentInfo = jest.requireMock(
  '#~/concepts/pipelines/content/tables/usePipelineRunExperimentInfo',
);

const defaultProps: React.ComponentProps<typeof PipelineRecurringRunTable> = {
  recurringRuns: [],
  refresh: jest.fn(),
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
};

const renderTable = (props: Partial<React.ComponentProps<typeof PipelineRecurringRunTable>> = {}) =>
  render(
    <BrowserRouter>
      <ExperimentContext.Provider value={{ experiment: null, basePath: '' }}>
        <PipelineRunExperimentsContext.Provider
          value={{ experiments: [], loaded: true, error: undefined }}
        >
          <PipelineRunVersionsContext.Provider
            value={{ versions: [], loaded: true, error: undefined }}
          >
            <PipelineRecurringRunTable {...defaultProps} {...props} />
          </PipelineRunVersionsContext.Provider>
        </PipelineRunExperimentsContext.Provider>
      </ExperimentContext.Provider>
    </BrowserRouter>,
  );

describe('PipelineRecurringRunTable', () => {
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
    usePipelineRunExperimentInfo.default.mockReturnValue({
      experiment: undefined,
      loaded: true,
      error: undefined,
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
    it('should show empty state when no schedules are provided', () => {
      renderTable({ recurringRuns: [], totalSize: 0 });

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('table rendering', () => {
    it('should render table rows when recurring runs are provided', () => {
      const mockRecurringRuns = [
        buildMockRecurringRunKF({
          display_name: 'test-pipeline',
          recurring_run_id: 'test-pipeline',
          experiment_id: 'test-experiment-1',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline-id',
            pipeline_version_id: 'test-version-1',
          },
        }),
        buildMockRecurringRunKF({
          display_name: 'other-pipeline',
          recurring_run_id: 'other-test-pipeline',
          experiment_id: 'test-experiment-2',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline-id',
            pipeline_version_id: 'test-version-2',
          },
        }),
        buildMockRecurringRunKF({
          display_name: 'another-pipeline',
          recurring_run_id: 'another-test-pipeline',
          experiment_id: 'test-experiment-1',
          pipeline_version_reference: {
            pipeline_id: 'test-pipeline-id',
            pipeline_version_id: 'test-version-2',
          },
        }),
      ];

      renderTable({ recurringRuns: mockRecurringRuns, totalSize: mockRecurringRuns.length });

      expect(screen.getByText('test-pipeline')).toBeInTheDocument();
      expect(screen.getByText('other-pipeline')).toBeInTheDocument();
      expect(screen.getByText('another-pipeline')).toBeInTheDocument();
    });

    it('should disable the toggle for schedules with an archived experiment', () => {
      const archivedExperiment = buildMockExperimentKF({
        experiment_id: 'test-experiment-2',
        display_name: 'Archived Experiment',
        storage_state: StorageStateKF.ARCHIVED,
      });
      const activeExperiment = buildMockExperimentKF({
        experiment_id: 'test-experiment-1',
        display_name: 'Active Experiment',
        storage_state: StorageStateKF.AVAILABLE,
      });

      // Return different experiments based on which recurring run is being queried
      usePipelineRunExperimentInfo.default.mockImplementation(
        (run: { experiment_id?: string } | null) => {
          if (run?.experiment_id === 'test-experiment-2') {
            return { experiment: archivedExperiment, loaded: true, error: undefined };
          }
          return { experiment: activeExperiment, loaded: true, error: undefined };
        },
      );

      const mockRecurringRuns = [
        buildMockRecurringRunKF({
          display_name: 'active-experiment-schedule',
          recurring_run_id: 'schedule-1',
          experiment_id: 'test-experiment-1',
          status: RecurringRunStatusType.ENABLED,
        }),
        buildMockRecurringRunKF({
          display_name: 'archived-experiment-schedule',
          recurring_run_id: 'schedule-2',
          experiment_id: 'test-experiment-2',
          status: RecurringRunStatusType.ENABLED,
        }),
      ];

      renderTable({ recurringRuns: mockRecurringRuns, totalSize: mockRecurringRuns.length });

      // Get all status switch containers by testid
      const statusSwitches = screen.getAllByTestId('recurring-run-status-switch');
      expect(statusSwitches).toHaveLength(2);

      // The first schedule (active experiment) should have an enabled toggle
      const firstSwitch = statusSwitches[0].querySelector('input[type="checkbox"]');
      expect(firstSwitch).not.toBeDisabled();

      // The second schedule (archived experiment) should have a disabled toggle
      const secondSwitch = statusSwitches[1].querySelector('input[type="checkbox"]');
      expect(secondSwitch).toBeDisabled();
    });
  });
});
