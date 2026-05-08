/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import AutomlReconfigureLoader from '~/app/pages/AutomlReconfigureLoader';
import type { PipelineRun } from '~/app/types';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

// ============================================================================
// Mocks
// ============================================================================

const mockUseParams = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => mockUseParams(),
}));

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-ns' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
    namespacesLoadError: undefined,
  }),
}));

const mockUsePipelineRunQuery = jest.fn();
jest.mock('~/app/hooks/queries', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

const mockGetSecretsQueryFn = jest.fn();
const mockGetSecrets = jest.fn().mockReturnValue(mockGetSecretsQueryFn);
jest.mock('~/app/api/k8s', () => ({
  getSecrets: () => (namespace: string, type?: string) => mockGetSecrets(namespace, type),
}));

const mockNotification = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  remove: jest.fn(),
};
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => mockNotification,
}));

jest.mock('~/app/components/common/AutomlHeader/AutomlHeader', () => ({
  __esModule: true,
  default: () => <span>AutoML</span>,
}));

jest.mock('~/app/components/empty-states/InvalidPipelineRun', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-run">Invalid Run</div>,
}));

jest.mock('~/app/components/empty-states/InvalidProject', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-project">Invalid Project</div>,
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    empty,
    loaded,
    emptyStatePage,
  }: {
    children: React.ReactNode;
    empty: boolean;
    loaded: boolean;
    emptyStatePage: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="applications-page">
      {empty ? emptyStatePage : null}
      {loaded && !empty ? children : null}
    </div>
  ),
}));

// Capture what AutomlConfigurePage receives
let capturedProps: {
  initialValues?: Partial<ConfigureSchema>;
  initialInputDataSecret?: unknown;
  sourceRunId?: string;
  sourceRunName?: string;
} = {};
jest.mock('~/app/pages/AutomlConfigurePage', () => ({
  __esModule: true,
  default: (props: typeof capturedProps) => {
    capturedProps = props;
    return (
      <div data-testid="configure-page">
        <span data-testid="source-run-id">{props.sourceRunId ?? ''}</span>
        <span data-testid="source-run-name">{props.sourceRunName ?? ''}</span>
        <span data-testid="initial-display-name">{props.initialValues?.display_name ?? ''}</span>
        <span data-testid="initial-task-type">{props.initialValues?.task_type ?? ''}</span>
      </div>
    );
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createMockPipelineRun = (
  overrides?: Partial<PipelineRun>,
  parameters?: Partial<ConfigureSchema>,
): PipelineRun => ({
  run_id: 'run-123',
  display_name: 'Original Run',
  state: 'SUCCEEDED',
  created_at: '2025-01-17T00:00:00Z',
  runtime_config: parameters ? ({ parameters } as PipelineRun['runtime_config']) : undefined,
  ...overrides,
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AutomlReconfigureLoader />
    </QueryClientProvider>,
  );
};

// ============================================================================
// Tests
// ============================================================================

describe('AutomlReconfigureLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProps = {};
    mockUseParams.mockReturnValue({ namespace: 'test-ns', runId: 'run-123' });

    const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
    useNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'test-ns' }],
      updatePreferredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    mockGetSecretsQueryFn.mockResolvedValue([]);
  });

  describe('loading state', () => {
    it('should show spinner while pipeline run is loading', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: true,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    });

    it('should show spinner while secrets are loading', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(),
        isPending: false,
        isError: false,
        error: null,
      });

      // Secrets never resolve — stays pending
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      mockGetSecretsQueryFn.mockReturnValue(new Promise(() => {}));

      renderPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    });

    it('should show spinner while namespaces are loading', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: false,
        namespacesLoadError: undefined,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('should render InvalidPipelineRun when run ID is not found (404)', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: true,
        error: new Error('Pipeline run not found: status code 404'),
      });

      renderPage();

      expect(screen.getByTestId('invalid-run')).toBeInTheDocument();
      expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    });

    it('should render load error for non-404 pipeline run errors', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: true,
        error: new Error('Internal server error: status code 500'),
      });

      renderPage();

      expect(screen.queryByTestId('invalid-run')).not.toBeInTheDocument();
      expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByTestId('applications-page')).toBeInTheDocument();
    });

    it('should render InvalidProject when namespace is invalid', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'other-ns' }],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId('invalid-project')).toBeInTheDocument();
      expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    });

    it('should render InvalidProject when no namespaces exist', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId('invalid-project')).toBeInTheDocument();
      expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    });
  });

  describe('passing initialValues to AutomlConfigurePage', () => {
    it('should pass sourceRunId to AutomlConfigurePage', async () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(await screen.findByTestId('source-run-id')).toHaveTextContent('run-123');
    });

    it('should pass sourceRunName with original display_name to AutomlConfigurePage', async () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun({ display_name: 'My Experiment' }),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(await screen.findByTestId('source-run-name')).toHaveTextContent('My Experiment');
    });

    it('should generate reconfigure name from original display_name', async () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun({ display_name: 'My Experiment' }),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(await screen.findByTestId('initial-display-name')).toHaveTextContent(
        'My Experiment - 1',
      );
    });

    it('should increment the suffix when original name already has one', async () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun({ display_name: 'My Experiment - 3' }),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(await screen.findByTestId('initial-display-name')).toHaveTextContent(
        'My Experiment - 4',
      );
    });

    it('should pass task_type from pipeline run parameters', async () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(undefined, {
          task_type: 'binary',
          train_data_secret_name: 'secret',
          train_data_bucket_name: 'bucket',
          train_data_file_key: 'data.csv',
          label_column: 'target',
          top_n: 5,
        }),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(await screen.findByTestId('initial-task-type')).toHaveTextContent('binary');
    });

    it('should default task_type to timeseries when not in parameters', async () => {
      // When parameters exist but task_type is missing, getTaskType returns timeseries
      const pipelineRun = createMockPipelineRun(undefined, {
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'data.csv',
        top_n: 3,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: pipelineRun,
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(await screen.findByTestId('initial-task-type')).toHaveTextContent('timeseries');
    });

    it('should pass all runtime parameters as initialValues', async () => {
      const params: Partial<ConfigureSchema> = {
        task_type: 'multiclass',
        train_data_secret_name: 'my-secret',
        train_data_bucket_name: 'my-bucket',
        train_data_file_key: 'train.csv',
        label_column: 'label',
        top_n: 7,
      };

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun({ display_name: 'Run A' }, params),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      expect(capturedProps.initialValues).toMatchObject({
        task_type: 'multiclass',
        train_data_secret_name: 'my-secret',
        train_data_bucket_name: 'my-bucket',
        train_data_file_key: 'train.csv',
        label_column: 'label',
        top_n: 7,
        display_name: 'Run A - 1',
      });
    });

    it('should pass timeseries parameters as initialValues', async () => {
      const params: Partial<ConfigureSchema> = {
        task_type: 'timeseries',
        train_data_secret_name: 'my-secret',
        train_data_bucket_name: 'my-bucket',
        train_data_file_key: 'ts.csv',
        target: 'sales',
        id_column: 'store_id',
        timestamp_column: 'date',
        prediction_length: 30,
        known_covariates_names: ['holiday', 'promo'],
        top_n: 3,
      };

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun({ display_name: 'TS Run' }, params),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      expect(capturedProps.initialValues).toMatchObject({
        task_type: 'timeseries',
        target: 'sales',
        id_column: 'store_id',
        timestamp_column: 'date',
        prediction_length: 30,
        known_covariates_names: ['holiday', 'promo'],
        top_n: 3,
        display_name: 'TS Run - 1',
      });
    });
  });

  describe('secret resolution', () => {
    it('should resolve initialInputDataSecret from secrets list when secret name matches', async () => {
      const mockSecrets = [
        {
          uuid: 'secret-uuid-1',
          name: 'my-aws-secret',
          type: 's3',
          data: { AWS_S3_BUCKET: 'bucket', AWS_DEFAULT_REGION: 'us-east-1' },
          displayName: 'My AWS Connection',
        },
      ];
      mockGetSecretsQueryFn.mockResolvedValue(mockSecrets);

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(
          { display_name: 'Run' },
          {
            task_type: 'binary',
            train_data_secret_name: 'my-aws-secret',
            train_data_bucket_name: 'bucket',
            train_data_file_key: 'file.csv',
            label_column: 'col',
            top_n: 3,
          },
        ),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      await waitFor(() => {
        expect(capturedProps.initialInputDataSecret).toMatchObject({
          uuid: 'secret-uuid-1',
          name: 'my-aws-secret',
          type: 's3',
          invalid: false,
        });
      });
    });

    it('should mark secret as invalid when required keys are missing', async () => {
      const mockSecrets = [
        {
          uuid: 'secret-uuid-2',
          name: 'incomplete-secret',
          type: 's3',
          data: { AWS_S3_BUCKET: 'bucket' }, // missing AWS_DEFAULT_REGION
        },
      ];
      mockGetSecretsQueryFn.mockResolvedValue(mockSecrets);

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(
          { display_name: 'Run' },
          {
            task_type: 'binary',
            train_data_secret_name: 'incomplete-secret',
            train_data_bucket_name: 'bucket',
            train_data_file_key: 'file.csv',
            label_column: 'col',
            top_n: 3,
          },
        ),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      await waitFor(() => {
        expect(capturedProps.initialInputDataSecret).toMatchObject({
          name: 'incomplete-secret',
          invalid: true,
        });
      });
    });

    it('should show warning and not set initialInputDataSecret when secret name does not match any fetched secret', async () => {
      mockGetSecretsQueryFn.mockResolvedValue([
        { uuid: 'other-uuid', name: 'other-secret', type: 's3', data: {} },
      ]);

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(
          { display_name: 'Run' },
          {
            task_type: 'binary',
            train_data_secret_name: 'missing-secret',
            train_data_bucket_name: 'bucket',
            train_data_file_key: 'file.csv',
            label_column: 'col',
            top_n: 3,
          },
        ),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      expect(capturedProps.initialInputDataSecret).toBeUndefined();

      await waitFor(() => {
        expect(mockNotification.warning).toHaveBeenCalledWith(
          'Connection secret not found',
          expect.stringContaining('missing-secret'),
        );
      });
    });

    it('should not set initialInputDataSecret when pipeline run has no secret name', async () => {
      mockGetSecretsQueryFn.mockResolvedValue([]);

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun({ display_name: 'Run' }),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      expect(capturedProps.initialInputDataSecret).toBeUndefined();
    });

    it('should show warning notification when secrets fail to load', async () => {
      mockGetSecretsQueryFn.mockRejectedValue(new Error('Network error'));

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(
          { display_name: 'Run' },
          {
            task_type: 'binary',
            train_data_secret_name: 'my-secret',
            train_data_bucket_name: 'bucket',
            train_data_file_key: 'file.csv',
            label_column: 'col',
            top_n: 3,
          },
        ),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      await waitFor(() => {
        expect(mockNotification.warning).toHaveBeenCalledWith(
          'Unable to load connection secrets',
          expect.stringContaining('manually select'),
        );
      });

      expect(capturedProps.initialInputDataSecret).toBeUndefined();
    });
  });

  describe('parameter parsing', () => {
    it('should show warning notification when runtime parameters fail Zod validation', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(
          { display_name: 'Run' },
          // top_n must be a number — passing a string triggers a parse failure
          { top_n: 'not-a-number' } as unknown as Partial<ConfigureSchema>,
        ),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      expect(mockNotification.warning).toHaveBeenCalledWith(
        'Unable to restore all settings',
        expect.stringContaining('could not be parsed'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse runtime parameters for reconfiguration:',
        expect.anything(),
      );

      consoleSpy.mockRestore();
    });

    it('should not show warning notification when runtime parameters parse successfully', async () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(
          { display_name: 'Run' },
          {
            task_type: 'binary',
            train_data_secret_name: 'secret',
            train_data_bucket_name: 'bucket',
            train_data_file_key: 'file.csv',
            label_column: 'col',
            top_n: 3,
          },
        ),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      expect(mockNotification.warning).not.toHaveBeenCalledWith(
        'Unable to restore all settings',
        expect.anything(),
      );
    });
  });

  describe('hook integration', () => {
    it('should pass namespace and runId from URL params to usePipelineRunQuery', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: true,
        isError: false,
        error: null,
      });

      renderPage();

      expect(mockUsePipelineRunQuery).toHaveBeenCalledWith('run-123', 'test-ns');
    });

    it('should fetch secrets scoped to the route namespace and storage type', async () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(),
        isPending: false,
        isError: false,
        error: null,
      });

      renderPage();

      await screen.findByTestId('configure-page');

      expect(mockGetSecrets).toHaveBeenCalledWith('test-ns', 'storage');
    });
  });
});
