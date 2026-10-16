/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { SecretSelection } from '@odh-dashboard/autox-core/ui/components/feature';
import AutoragReconfigureLoader from '~/app/pages/AutoragReconfigureLoader';
import type { PipelineRun } from '~/app/types';

const mockUseParams = jest.fn();
const mockGetSecrets = jest.fn();
const mockUseSecretsQuery = jest.fn();
const mockWarning = jest.fn();
let capturedProps: Record<string, unknown> = {};

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => mockUseParams(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-ns' }],
    namespacesLoaded: true,
    namespacesLoadError: undefined,
  }),
}));

const mockUsePipelineRunQuery = jest.fn();
jest.mock('~/app/hooks/usePipelineRunQuery', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/hooks'),
  useSecretsQuery: (namespace?: string, type?: string) => {
    mockUseSecretsQuery(namespace, type);
    return jest.requireActual('@tanstack/react-query').useQuery({
      queryKey: ['secrets', namespace, type],
      queryFn: () => mockGetSecrets(type),
      enabled: Boolean(namespace),
      retry: false,
    });
  },
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ warning: mockWarning, success: jest.fn(), error: jest.fn() }),
}));

jest.mock('~/app/components/common/AutoragHeader/AutoragHeader', () => ({
  __esModule: true,
  default: () => <span>AutoRAG</span>,
}));

jest.mock('@odh-dashboard/autox-core/ui/components/feature', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/components/feature'),
  InvalidPipelineRun: () => <div data-testid="invalid-run">Invalid Run</div>,
}));

jest.mock('~/app/components/empty-states/InvalidProject', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-project">Invalid Project</div>,
}));
jest.mock('~/app/pages/AutoragConfigurePage', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid="configure-page" />;
  },
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    empty,
    emptyStatePage,
    loaded,
  }: {
    children?: React.ReactNode;
    empty: boolean;
    emptyStatePage?: React.ReactNode;
    loaded: boolean;
  }) => (
    <div data-testid="applications-page">{empty ? emptyStatePage : loaded ? children : null}</div>
  ),
}));

const createRun = (parameters?: Record<string, unknown>): PipelineRun => ({
  run_id: 'run-123',
  display_name: 'Original Run',
  state: 'SUCCEEDED',
  created_at: '2025-01-01T00:00:00Z',
  runtime_config: parameters ? { parameters } : undefined,
});

const renderPage = (client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) =>
  render(
    <QueryClientProvider client={client}>
      <AutoragReconfigureLoader />
    </QueryClientProvider>,
  );

describe('AutoragReconfigureLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProps = {};
    mockUseParams.mockReturnValue({ namespace: 'test-ns', runId: 'run-123' });
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun(),
      isPending: false,
      isError: false,
      error: null,
    });
    mockGetSecrets.mockResolvedValue([]);
    mockUseSecretsQuery.mockClear();
  });

  it('should warn and keep the form flow for legacy runtime fields', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_key: 'legacy.pdf',
        ogx_secret_name: 'ogx',
        vector_io_provider_id: 'milvus',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
    expect(capturedProps.initialValues).toMatchObject({
      input_data_keys: ['legacy.pdf'],
      maas_secret_name: '',
      db_secret_name: '',
      generation_models: [],
      embedding_models: [],
    });
    expect(mockUseSecretsQuery).not.toHaveBeenCalledWith('test-ns', 'database');
  });

  it('should restore a legacy database name without requiring the legacy field', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'database'
        ? [
            {
              name: 'legacy-db',
              type: 'database',
              data: { MILVUS_URI: '[REDACTED]' },
              databaseProviders: ['milvus'],
            },
          ]
        : [],
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_key: 'legacy.pdf',
        ogx_secret_name: 'ogx',
        vector_io_provider_id: 'milvus',
        db_secret_name: 'legacy-db',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: 'legacy-db' });
    expect(mockGetSecrets).toHaveBeenCalledWith('database');
    expect(mockGetSecrets).not.toHaveBeenCalledWith('vector-db');
  });

  it('should restore an available legacy database connection into the canonical form field', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'database'
        ? [
            {
              name: 'legacy-db',
              type: 'database',
              data: { MILVUS_URI: '[REDACTED]' },
              databaseProviders: ['milvus'],
            },
          ]
        : [],
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_key: 'legacy.pdf',
        ogx_secret_name: 'ogx',
        vector_io_provider_id: 'milvus',
        vector_db_secret_name: 'legacy-db',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: 'legacy-db' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({ name: 'legacy-db' });
    expect(mockGetSecrets).not.toHaveBeenCalledWith('vector-db');
  });

  it('should preserve an unavailable legacy database connection as disabled display-only context', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_key: 'legacy.pdf',
        ogx_secret_name: 'ogx',
        vector_io_provider_id: 'milvus',
        vector_db_secret_name: 'missing-legacy-db',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: '' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({
      name: 'missing-legacy-db',
      uuid: 'unavailable-missing-legacy-db',
      invalid: true,
    });
    expect(capturedProps.preserveInitialDatabaseSecret).toBe(true);
    expect(mockGetSecrets).not.toHaveBeenCalledWith('vector-db');
  });

  it('should reset an empty legacy input_data_key while retaining the warning behavior', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({ input_data_key: '   ', ogx_secret_name: 'ogx' }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ input_data_keys: [] });
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
  });

  it('should restore canonical values and resolve new connection Secrets', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'storage'
          ? [{ name: 'storage', type: 's3', data: { AWS_S3_BUCKET: 'bucket' } }]
          : type === 'maas'
            ? [{ name: 'maas', type: 'maas', data: {} }]
            : [
                {
                  name: 'vector-db',
                  type: 'database',
                  data: { MILVUS_URI: '[REDACTED]' },
                  databaseProviders: ['milvus'],
                },
              ],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_secret_name: 'storage',
        input_data_keys: ['documents/a.pdf', 'documents/b.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
    expect(capturedProps.initialValues).toMatchObject({
      input_data_keys: ['documents/a.pdf', 'documents/b.pdf'],
      maas_secret_name: 'maas',
      db_secret_name: 'vector-db',
      generation_models: ['model-a'],
      embedding_models: ['model-b'],
    });
    expect(capturedProps.initialMaaSSecret).toMatchObject({ name: 'maas' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({ name: 'vector-db' });
  });

  it('should prefer db_secret_name over the legacy collision for form and secret selection', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'storage'
          ? []
          : type === 'maas'
            ? []
            : [
                {
                  name: 'canonical-db',
                  type: 'database',
                  data: { MILVUS_URI: '[REDACTED]' },
                  databaseProviders: ['milvus'],
                },
                {
                  name: 'legacy-db',
                  type: 'database',
                  data: { MILVUS_URI: '[REDACTED]' },
                  databaseProviders: ['milvus'],
                },
              ],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: 'canonical-db',
        vector_db_secret_name: 'legacy-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: 'canonical-db' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({ name: 'canonical-db' });
  });

  it('should restore and select the legacy secret when the canonical value is empty', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'database'
          ? [
              {
                name: 'legacy-db',
                type: 'database',
                data: { MILVUS_URI: '[REDACTED]' },
                databaseProviders: ['milvus'],
              },
            ]
          : [],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: '',
        vector_db_secret_name: 'legacy-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: 'legacy-db' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({ name: 'legacy-db' });
    expect(capturedProps.preserveInitialDatabaseSecret).toBe(true);
  });

  it('should use the canonical database result when the legacy field is also present', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'database'
          ? [
              {
                uuid: 'current-db-uuid',
                name: 'shared-db',
                type: 'database',
                data: { MILVUS_URI: '[REDACTED]' },
                databaseProviders: ['milvus'],
              },
            ]
          : [],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: '',
        vector_db_secret_name: 'shared-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialDatabaseSecret).toMatchObject({
      name: 'shared-db',
      uuid: 'current-db-uuid',
    });
  });

  it('should preserve an invalid database result as unavailable', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'database'
          ? [
              {
                uuid: 'current-db-uuid',
                name: 'shared-db',
                type: 'database',
                data: { MILVUS_URI: '[REDACTED]' },
              },
            ]
          : [],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: '',
        vector_db_secret_name: 'shared-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: '' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({
      name: 'shared-db',
      uuid: 'unavailable-shared-db',
      invalid: true,
    });
  });

  it('should preserve an unavailable canonical value without falling back to another connection', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(type === 'database' ? [] : []),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: 'missing-canonical-db',
        vector_db_secret_name: 'legacy-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: '' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({
      name: 'missing-canonical-db',
      uuid: 'unavailable-missing-canonical-db',
      invalid: true,
    });
    expect(capturedProps.preserveInitialDatabaseSecret).toBe(true);
    expect(mockGetSecrets).not.toHaveBeenCalledWith('vector-db');
  });

  it('should preserve a missing current-format database secret for display without restoring it', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(type === 'maas' ? [{ name: 'maas', type: 'maas', data: {} }] : []),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: 'missing-current-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ db_secret_name: '' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({
      name: 'missing-current-db',
      uuid: 'unavailable-missing-current-db',
      invalid: true,
    });
    expect(capturedProps.preserveInitialDatabaseSecret).toBe(true);
  });

  it('should keep an unavailable mixed-provider legacy connection disabled', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'database'
          ? [
              {
                name: 'legacy-mixed-db',
                type: 'database',
                data: {
                  MILVUS_URI: '[REDACTED]',
                  NEO4J_URI: '[REDACTED]',
                  NEO4J_PASSWORD: '[REDACTED]',
                },
                databaseProviders: ['milvus', 'neo4j'],
              },
            ]
          : [],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'legacy-mixed-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialDatabaseSecret).toMatchObject({
      name: 'legacy-mixed-db',
      uuid: 'unavailable-legacy-mixed-db',
      invalid: true,
    });
    expect(capturedProps.preserveInitialDatabaseSecret).toBe(true);
    expect(mockGetSecrets).not.toHaveBeenCalledWith('vector-db');
  });

  it('should normalize legacy optimization metrics using the restored preset', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
        preset: 'balanced',
        optimization_metric: 'faithfulness',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({
      preset: 'balanced',
      optimization_metric: 'ragas:faithfulness',
    });
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
  });

  it.each([
    ['answer_correctness', 'unitxt:answer_correctness'],
    ['overall_score', 'custom:overall_score'],
  ])('should restore the historical %s alias without warning', async (metric, expected) => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
        optimization_metric: metric,
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ optimization_metric: expected });
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
  });

  it('should fall back and warn for an invalid or preset-incompatible stored metric', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
        preset: 'speed',
        optimization_metric: 'ragas:faithfulness',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({
      optimization_metric: 'custom:overall_score',
    });
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
  });

  it('should resolve restored model overlap in favor of generation models without warning', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_secret_name: 'storage',
        input_data_keys: ['documents/a.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['shared-model', 'generation-model'],
        embedding_models: ['shared-model', 'embedding-model'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({
      generation_models: ['shared-model', 'generation-model'],
      embedding_models: ['embedding-model'],
    });
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
  });

  it('should trim restored canonical input data keys', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_secret_name: 'storage',
        input_data_keys: ['  documents/a.pdf  ', '\tdocuments/b.pdf\n'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({
      input_data_keys: ['documents/a.pdf', 'documents/b.pdf'],
    });
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
  });

  it('should warn and default whitespace-only canonical input data keys', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['  '],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(capturedProps.initialValues).toMatchObject({ input_data_keys: [] });
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
  });

  it('should restore a current run persisted with the temporary KFP input_data_key adapter', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'storage'
          ? [{ name: 'storage', type: 's3', data: { AWS_S3_BUCKET: 'bucket' } }]
          : type === 'maas'
            ? [{ name: 'maas', type: 'maas', data: {} }]
            : [
                {
                  name: 'vector-db',
                  type: 'database',
                  data: { MILVUS_URI: '[REDACTED]' },
                  databaseProviders: ['milvus'],
                },
              ],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_key: 'documents/input.pdf',
        input_data_secret_name: 'storage',
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
    expect(capturedProps.initialValues).toMatchObject({
      input_data_keys: ['documents/input.pdf'],
      maas_secret_name: 'maas',
      db_secret_name: 'vector-db',
      generation_models: ['model-a'],
      embedding_models: ['model-b'],
    });
    expect(capturedProps.initialMaaSSecret).toMatchObject({ name: 'maas' });
    expect(capturedProps.initialDatabaseSecret).toMatchObject({ name: 'vector-db' });
  });

  it('should prefer complete canonical values when legacy runtime keys are also present', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      Promise.resolve(
        type === 'storage'
          ? [{ name: 'storage', type: 's3', data: { AWS_S3_BUCKET: 'bucket' } }]
          : type === 'maas'
            ? [{ name: 'maas', type: 'maas', data: {} }]
            : [
                {
                  name: 'vector-db',
                  type: 'database',
                  data: { MILVUS_URI: '[REDACTED]' },
                  databaseProviders: ['milvus'],
                },
              ],
      ),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_key: 'stale-legacy-key.pdf',
        ogx_secret_name: 'stale-ogx',
        vector_io_provider_id: 'stale-provider',
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
    expect(capturedProps.initialValues).toMatchObject({
      input_data_keys: ['documents/input.pdf'],
      maas_secret_name: 'maas',
      db_secret_name: 'vector-db',
      generation_models: ['model-a'],
      embedding_models: ['model-b'],
    });
  });

  it('should retain the warning/default behavior for malformed nonlegacy parameters', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'vector-db',
        generation_models: [],
        embedding_models: ['model-b'],
        optimization_max_rag_patterns: 'invalid',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to restore all settings',
      'Some parameters from the previous run could not be parsed. Default values will be used instead.',
    );
    expect(capturedProps.initialValues).toMatchObject({
      input_data_keys: ['documents/input.pdf'],
      generation_models: [],
      embedding_models: ['model-b'],
      maas_secret_name: 'maas',
      db_secret_name: '',
    });
  });

  it('should preserve missing MaaS and vector secret warnings without adding a model warning', async () => {
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/input.pdf'],
        input_data_secret_name: 'storage',
        maas_secret_name: 'missing-maas',
        vector_db_secret_name: 'missing-vector-db',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).toHaveBeenCalledWith(
      'Connection secret not found',
      'The previously used MaaS connection "missing-maas" could not be found. Please select a new connection.',
    );
    expect(mockWarning).toHaveBeenCalledWith(
      'Connection secret not found',
      'The previously used database connection "missing-vector-db" could not be found. Please select a new connection.',
    );
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Some previously selected models are unavailable',
      'One or more previously selected foundation or embedding models are no longer available and have been removed from your selection.',
    );
  });

  it('should warn when storage Secrets cannot be loaded for a legacy run', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'storage'
        ? Promise.reject(new Error('storage request failed'))
        : Promise.resolve([]),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({ input_data_key: 'legacy.pdf', ogx_secret_name: 'ogx' }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to load connection secrets',
      'The previously used connection secrets could not be loaded. You will need to manually select connection secrets.',
    );
  });

  it('should wait for the current database query before warning about a missing connection', async () => {
    let resolveDatabase: ((secrets: never[]) => void) | undefined;
    const databaseQuery = new Promise<never[]>((resolve) => {
      resolveDatabase = resolve;
    });
    mockGetSecrets.mockImplementation((type: string) => {
      if (type === 'database') {
        return databaseQuery;
      }
      return Promise.resolve([]);
    });
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas',
        vector_db_secret_name: 'missing-database',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();
    await waitFor(() => expect(mockGetSecrets).toHaveBeenCalledWith('database'));
    expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Connection secret not found',
      'The previously used database connection "missing-database" could not be found. Please select a new connection.',
    );

    await act(async () => {
      resolveDatabase?.([]);
    });
    await screen.findByTestId('configure-page');
    expect(mockWarning).toHaveBeenCalledWith(
      'Connection secret not found',
      'The previously used database connection "missing-database" could not be found. Please select a new connection.',
    );
    expect(
      mockWarning.mock.calls.filter(
        ([title, body]) =>
          title === 'Connection secret not found' &&
          body ===
            'The previously used database connection "missing-database" could not be found. Please select a new connection.',
      ),
    ).toHaveLength(1);
  });

  it('should wait for a current database query before warning about a missing connection', async () => {
    let resolveDatabase: ((secrets: never[]) => void) | undefined;
    const databaseQuery = new Promise<never[]>((resolve) => {
      resolveDatabase = resolve;
    });
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'database'
        ? databaseQuery
        : type === 'maas'
          ? Promise.resolve([{ uuid: 'maas-uuid', name: 'maas', type: 'maas', data: {} }])
          : Promise.resolve([]),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: 'missing-database',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();
    await waitFor(() => expect(mockGetSecrets).toHaveBeenCalledWith('database'));
    expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    expect(mockWarning).not.toHaveBeenCalledWith(
      'Connection secret not found',
      'The previously used database connection "missing-database" could not be found. Please select a new connection.',
    );

    await act(async () => {
      resolveDatabase?.([]);
    });
    await screen.findByTestId('configure-page');
    await waitFor(() =>
      expect(mockWarning).toHaveBeenCalledWith(
        'Connection secret not found',
        'The previously used database connection "missing-database" could not be found. Please select a new connection.',
      ),
    );
    expect(
      mockWarning.mock.calls.filter(
        ([title, body]) =>
          title === 'Connection secret not found' &&
          body ===
            'The previously used database connection "missing-database" could not be found. Please select a new connection.',
      ),
    ).toHaveLength(1);
  });

  it('should warn when the enabled database query fails', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'database'
        ? Promise.reject(new Error('database request failed'))
        : Promise.resolve([]),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: 'database',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to load connection secrets',
      'The previously used connection secrets could not be loaded. You will need to manually select connection secrets.',
    );
  });

  it('should warn when the legacy database query fails', async () => {
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'database'
        ? Promise.reject(new Error('database request failed'))
        : Promise.resolve([]),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_key: 'legacy.pdf',
        ogx_secret_name: 'ogx',
        vector_io_provider_id: 'milvus',
        vector_db_secret_name: 'legacy-db',
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(await screen.findByTestId('configure-page')).toBeInTheDocument();
    expect(mockWarning).toHaveBeenCalledWith(
      'Unable to load connection secrets',
      'The previously used connection secrets could not be loaded. You will need to manually select connection secrets.',
    );
  });

  it('should not warn when a cached database miss is refetched and resolves the secret', async () => {
    let resolveDatabase: ((secrets: SecretSelection[]) => void) | undefined;
    const databaseQuery = new Promise<SecretSelection[]>((resolve) => {
      resolveDatabase = resolve;
    });
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'database'
        ? databaseQuery
        : type === 'maas'
          ? Promise.resolve([{ uuid: 'maas-uuid', name: 'maas', type: 'maas', data: {} }])
          : Promise.resolve([]),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: 'database',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['secrets', 'test-ns', 'database'], []);

    renderPage(queryClient);
    await waitFor(() => expect(mockGetSecrets).toHaveBeenCalledWith('database'));
    expect(screen.queryByTestId('configure-page')).not.toBeInTheDocument();
    expect(mockWarning).not.toHaveBeenCalled();

    await act(async () => {
      resolveDatabase?.([
        {
          uuid: 'database-uuid',
          name: 'database',
          type: 'database',
          data: {},
          databaseProviders: ['milvus'],
        },
      ]);
    });
    await waitFor(() =>
      expect(capturedProps.initialDatabaseSecret).toMatchObject({ name: 'database' }),
    );
    expect(mockWarning).not.toHaveBeenCalled();
  });

  it('should not warn when a pending current database query resolves the matching secret', async () => {
    let resolveDatabase: ((secrets: SecretSelection[]) => void) | undefined;
    const databaseQuery = new Promise<SecretSelection[]>((resolve) => {
      resolveDatabase = resolve;
    });
    mockGetSecrets.mockImplementation((type: string) =>
      type === 'database'
        ? databaseQuery
        : type === 'maas'
          ? Promise.resolve([{ uuid: 'maas-uuid', name: 'maas', type: 'maas', data: {} }])
          : Promise.resolve([]),
    );
    mockUsePipelineRunQuery.mockReturnValue({
      data: createRun({
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas',
        db_secret_name: 'database',
        generation_models: ['model-a'],
        embedding_models: ['model-b'],
      }),
      isPending: false,
      isError: false,
      error: null,
    });

    renderPage();
    await waitFor(() => expect(mockGetSecrets).toHaveBeenCalledWith('database'));
    expect(mockWarning).not.toHaveBeenCalled();

    await act(async () => {
      resolveDatabase?.([
        {
          uuid: 'database-uuid',
          name: 'database',
          type: 'database',
          data: {},
          databaseProviders: ['milvus'],
        },
      ]);
    });
    await screen.findByTestId('configure-page');
    expect(mockWarning).not.toHaveBeenCalled();
  });
});
