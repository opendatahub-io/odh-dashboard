/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutoragReconfigureLoader from '~/app/pages/AutoragReconfigureLoader';
import type { PipelineRun } from '~/app/types';

const mockUseParams = jest.fn();
const mockUsePipelineRunQuery = jest.fn();
const mockGetSecrets = jest.fn();
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

jest.mock('~/app/hooks/queries', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

jest.mock('~/app/api/k8s', () => ({
  getSecrets: () => (_namespace: string, type: string) => () => mockGetSecrets(type),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ warning: mockWarning, success: jest.fn(), error: jest.fn() }),
}));

jest.mock('~/app/components/common/AutoragHeader/AutoragHeader', () => ({
  __esModule: true,
  default: () => <span>AutoRAG</span>,
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

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
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
      vector_db_secret_name: '',
      generation_models: [],
      embedding_models: [],
    });
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
            : [{ name: 'vector-db', type: 'vector-db', data: { MILVUS_URI: '[REDACTED]' } }],
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
    expect(capturedProps.initialValues).toMatchObject({
      input_data_keys: ['documents/a.pdf', 'documents/b.pdf'],
      maas_secret_name: 'maas',
      vector_db_secret_name: 'vector-db',
      generation_models: ['model-a'],
      embedding_models: ['model-b'],
    });
    expect(capturedProps.initialMaaSSecret).toMatchObject({ name: 'maas' });
    expect(capturedProps.initialVectorDbSecret).toMatchObject({ name: 'vector-db' });
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
      vector_db_secret_name: 'vector-db',
    });
  });
});
