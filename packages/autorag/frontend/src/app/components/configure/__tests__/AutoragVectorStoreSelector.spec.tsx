import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import type { SecretSelection } from '@odh-dashboard/autox-core/ui/components/feature';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';
import {
  fireAutoragVectorStoreConfigured,
  TrackingOutcome,
  type VectorStoreProviderType,
} from '~/app/utilities/tracking';

let mockVectorModalOnSubmit:
  ((name: string, provider: VectorStoreProviderType) => Promise<void>) | undefined;
let mockVectorRefresh: () => Promise<SecretListItem[] | undefined> = async () => [];
let mockVectorSelection: SecretSelection | undefined;
let mockVectorOnChange: ((value: SecretSelection | undefined) => void) | undefined;

jest.mock('~/app/utilities/tracking', () => ({
  ...jest.requireActual('~/app/utilities/tracking'),
  fireAutoragVectorStoreConfigured: jest.fn(),
}));

jest.mock('~/app/components/common/VectorDbConnectionModal', () => ({
  __esModule: true,
  default: ({
    onSubmit,
    initialProvider,
  }: {
    onSubmit: (name: string, provider: VectorStoreProviderType) => Promise<void>;
    initialProvider: string;
  }) => {
    mockVectorModalOnSubmit = onSubmit;
    return <div data-testid="vector-db-modal" data-initial-provider={initialProvider} />;
  },
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('@odh-dashboard/autox-core/ui/components/feature', () => ({
  __esModule: true,
  SecretSelector: ({
    onChange,
    dataTestId,
    type,
    value,
    valueName,
    onRefreshReady,
    provider,
    allowedProviders,
  }: {
    onChange: (value: SecretSelection | undefined) => void;
    dataTestId: string;
    type: string;
    value?: string;
    valueName?: string;
    onRefreshReady?: (refresh: () => Promise<SecretListItem[] | undefined>) => void;
    provider?: string;
    allowedProviders?: readonly string[];
  }) => {
    mockVectorOnChange = onChange;
    onRefreshReady?.(mockVectorRefresh);
    return (
      <>
        <button
          data-testid={dataTestId}
          data-secret-type={type}
          data-secret-provider={provider}
          data-allowed-providers={allowedProviders?.join(',')}
          data-selected-value={value}
          data-value-name={valueName}
          onClick={() =>
            onChange(
              mockVectorSelection ?? {
                uuid: 'vector-db-1',
                name: 'vector-db-secret',
                data: {},
                invalid: false,
              },
            )
          }
        >
          Select vector database secret
        </button>
        <button
          type="button"
          data-testid={`${dataTestId}-clear-selection`}
          onClick={() => mockVectorOnChange?.(undefined)}
        />
      </>
    );
  },
}));

const schema = createConfigureSchema();
const mockUseParams = jest.mocked(useParams);
const mockFireAutoragVectorStoreConfigured = jest.mocked(fireAutoragVectorStoreConfigured);

const FormWrapper: React.FC<{
  children: React.ReactNode;
  onChange?: (values: typeof schema.defaults) => void;
  defaultValues?: Partial<typeof schema.defaults>;
}> = ({ children, onChange, defaultValues }) => {
  const form = useForm({
    mode: 'onChange',
    defaultValues: { ...schema.defaults, ...defaultValues },
  });
  React.useEffect(() => {
    const subscription = form.watch((values) => onChange?.(values as typeof schema.defaults));
    return () => subscription.unsubscribe();
  }, [form, onChange]);
  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('AutoragVectorStoreSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVectorRefresh = async () => [];
    mockVectorModalOnSubmit = undefined;
    mockVectorSelection = undefined;
    mockVectorOnChange = undefined;
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  it('should query one database Secret filter for all providers', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-secret-type',
      'database',
    );
    expect(screen.getByTestId('database-secret-selector')).not.toHaveAttribute(
      'data-secret-provider',
    );
    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-allowed-providers',
      'milvus,pgvector,neo4j',
    );
  });

  it('should not render RAG template mode controls', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    expect(screen.queryByRole('radiogroup', { name: 'RAG template' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('autorag-rag-mode-simple')).not.toBeInTheDocument();
    expect(screen.queryByTestId('autorag-rag-mode-graph')).not.toBeInTheDocument();
  });

  it('should render an action to add a vector database connection', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    expect(screen.getByTestId('add-database-connection-button')).toHaveTextContent(
      'Add new connection',
    );
    expect(screen.getByTestId('add-database-connection-button')).toHaveClass('pf-v6-u-text-nowrap');
    expect(
      screen.getByTestId('add-database-dropdown-toggle').closest('.pf-v6-c-menu-toggle'),
    ).toHaveClass('pf-m-secondary');
  });

  it('should offer exactly Milvus, PGVector, and Neo4j creation options', async () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-database-dropdown-toggle'));
    });
    expect(screen.getByTestId('add-milvus-connection-option')).toHaveTextContent(
      'Add Milvus connection',
    );
    expect(screen.getByTestId('add-pgvector-connection-option')).toHaveTextContent(
      'Add PGVector connection',
    );
    expect(screen.getByTestId('add-neo4j-connection-option')).toHaveTextContent(
      'Add Neo4j connection',
    );
  });

  it.each([
    ['milvus', 'add-milvus-connection-option'],
    ['pgvector', 'add-pgvector-connection-option'],
    ['neo4j', 'add-neo4j-connection-option'],
  ])('should preselect %s when adding that connection', async (provider, optionTestId) => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-database-dropdown-toggle'));
    fireEvent.click(screen.getByTestId(optionTestId).querySelector('button') as HTMLElement);
    expect(screen.getByTestId('vector-db-modal')).toHaveAttribute(
      'data-initial-provider',
      provider,
    );
  });

  it('should preselect Milvus from the split-button primary action', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-database-connection-button'));
    expect(screen.getByTestId('vector-db-modal')).toHaveAttribute(
      'data-initial-provider',
      'milvus',
    );
  });

  it('should store the selected vector database Secret name', () => {
    let values: typeof schema.defaults | undefined;

    render(
      <FormWrapper onChange={(nextValues) => (values = nextValues)}>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('database-secret-selector'));
    expect(values?.db_secret_name).toBe('vector-db-secret');
  });

  it('should clear the form value when the selected connection disappears', () => {
    let values: typeof schema.defaults | undefined;

    render(
      <FormWrapper onChange={(nextValues) => (values = nextValues)}>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('database-secret-selector'));
    expect(values?.db_secret_name).toBe('vector-db-secret');

    fireEvent.click(screen.getByTestId('database-secret-selector-clear-selection'));
    expect(values?.db_secret_name).toBe('');
  });

  it('should display the unavailable initial connection without restoring its form value', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector
          initialSecret={{
            uuid: 'missing-db',
            name: 'missing-db',
            data: {},
            invalid: true,
          }}
          preserveInitialSelection
        />
      </FormWrapper>,
    );

    const selector = screen.getByTestId('database-secret-selector');
    expect(selector).toHaveAttribute('data-value-name', 'missing-db');
    expect(selector).not.toHaveAttribute('data-selected-value', 'missing-db');
  });

  it('should remain invalid until an available replacement is selected', () => {
    let values: typeof schema.defaults | undefined;
    /* eslint-disable camelcase */
    const validDefaults = {
      display_name: 'Run',
      input_data_secret_name: 'storage',
      input_data_bucket_name: 'bucket',
      input_data_keys: ['document.pdf'],
      test_data_secret_name: 'storage',
      test_data_bucket_name: 'bucket',
      test_data_key: 'test.json',
      maas_secret_name: 'maas',
      generation_models: ['generation-model'],
      embedding_models: ['embedding-model'],
    };
    /* eslint-enable camelcase */

    render(
      <FormWrapper defaultValues={validDefaults} onChange={(nextValues) => (values = nextValues)}>
        <AutoragVectorStoreSelector
          initialSecret={{
            uuid: 'missing-db',
            name: 'missing-db',
            data: {},
            invalid: true,
          }}
          preserveInitialSelection
        />
      </FormWrapper>,
    );

    expect(schema.full.safeParse(values).success).toBe(false);
    fireEvent.click(screen.getByTestId('database-secret-selector'));
    expect(schema.full.safeParse(values).success).toBe(true);
    expect(values?.db_secret_name).toBe('vector-db-secret');
  });

  it('should select and preserve a legacy-only Milvus Secret', () => {
    let values: typeof schema.defaults | undefined;
    mockVectorSelection = {
      uuid: 'legacy-milvus',
      name: 'legacy-milvus',
      data: {
        MILVUS_URI: '[REDACTED]',
        MILVUS_SERVER_CERT: '[REDACTED]',
      },
      databaseProviders: ['milvus'],
      invalid: false,
    };
    const ControlledSelector = () => {
      const [selectedSecret, setSelectedSecret] = React.useState<SecretSelection>();
      const [renderKey, setRenderKey] = React.useState(0);

      return (
        <>
          <button data-testid="remount-selector" onClick={() => setRenderKey((key) => key + 1)}>
            Remount
          </button>
          <AutoragVectorStoreSelector
            key={renderKey}
            selectedSecret={selectedSecret}
            onSelectedSecretChange={setSelectedSecret}
          />
        </>
      );
    };

    render(
      <FormWrapper onChange={(nextValues) => (values = nextValues)}>
        <ControlledSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('database-secret-selector'));
    expect(values?.db_secret_name).toBe('legacy-milvus');
    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-selected-value',
      'legacy-milvus',
    );
    expect(mockFireAutoragVectorStoreConfigured).toHaveBeenCalledWith({
      providerType: 'milvus',
      outcome: TrackingOutcome.submit,
      success: true,
    });
    expect(JSON.stringify(mockFireAutoragVectorStoreConfigured.mock.calls)).not.toContain(
      'MILVUS_SERVER_CERT',
    );

    fireEvent.click(screen.getByTestId('remount-selector'));
    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-selected-value',
      'legacy-milvus',
    );
  });

  it('should reject creation when the new vector database Secret is missing after refresh', async () => {
    mockVectorRefresh = async () => [];
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-database-connection-button'));
    await expect(mockVectorModalOnSubmit?.('new-vector-db-secret', 'milvus')).rejects.toThrow(
      'not found after refreshing',
    );
    expect(screen.getByTestId('vector-db-modal')).toBeInTheDocument();
  });

  it.each([
    ['missing metadata', undefined],
    ['empty metadata', []],
    ['ambiguous metadata', ['milvus', 'pgvector']],
  ])('should reject a new connection with %s', async (_name, databaseProviders) => {
    let values: typeof schema.defaults | undefined;
    mockVectorRefresh = async () => [
      {
        name: 'new-vector-db-secret',
        uuid: 'new-vector-db-secret',
        data: { MILVUS_URI: '[REDACTED]' },
        ...(databaseProviders === undefined ? {} : { databaseProviders }),
      } as SecretListItem,
    ];
    render(
      <FormWrapper onChange={(nextValues) => (values = nextValues)}>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-database-connection-button'));

    await expect(mockVectorModalOnSubmit?.('new-vector-db-secret', 'milvus')).rejects.toThrow(
      'invalid or mismatched provider metadata',
    );
    expect(values).toBeUndefined();
  });

  it('should reject a new connection whose provider does not match the requested provider', async () => {
    mockVectorRefresh = async () => [
      {
        name: 'new-vector-db-secret',
        uuid: 'new-vector-db-secret',
        data: { PGVECTOR_HOST: '[REDACTED]' },
        databaseProviders: ['pgvector'],
      },
    ];
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-database-dropdown-toggle'));
    await screen.findByTestId('add-milvus-connection-option');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Milvus connection' }));
    await screen.findByTestId('vector-db-modal');

    await expect(mockVectorModalOnSubmit?.('new-vector-db-secret', 'milvus')).rejects.toThrow(
      'invalid or mismatched provider metadata',
    );
  });

  it('should select a new connection with matching provider metadata', async () => {
    let values: typeof schema.defaults | undefined;
    mockVectorRefresh = async () => [
      {
        name: 'new-vector-db-secret',
        uuid: 'new-vector-db-secret',
        data: {
          MILVUS_URI: '[REDACTED]',
          MILVUS_CA_CERT: '[REDACTED]',
        },
        databaseProviders: ['milvus'],
      },
    ];
    render(
      <FormWrapper onChange={(nextValues) => (values = nextValues)}>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-database-connection-button'));

    await act(async () => {
      await expect(
        mockVectorModalOnSubmit?.('new-vector-db-secret', 'milvus'),
      ).resolves.toBeUndefined();
    });
    expect(values?.db_secret_name).toBe('new-vector-db-secret');
    expect(mockFireAutoragVectorStoreConfigured).toHaveBeenCalledWith({
      providerType: 'milvus',
      outcome: TrackingOutcome.submit,
      success: true,
    });
    expect(JSON.stringify(mockFireAutoragVectorStoreConfigured.mock.calls)).not.toContain(
      'MILVUS_CA_CERT',
    );
  });

  it('should preserve a selected connection when the selector remounts', () => {
    const ControlledSelector = () => {
      const [selectedSecret, setSelectedSecret] = React.useState<SecretListItem>();
      const [renderKey, setRenderKey] = React.useState(0);

      return (
        <>
          <button data-testid="remount-selector" onClick={() => setRenderKey((key) => key + 1)}>
            Remount
          </button>
          <AutoragVectorStoreSelector
            key={renderKey}
            selectedSecret={selectedSecret}
            onSelectedSecretChange={setSelectedSecret}
          />
        </>
      );
    };

    render(
      <FormWrapper>
        <ControlledSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('database-secret-selector'));
    fireEvent.click(screen.getByTestId('remount-selector'));

    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-selected-value',
      'vector-db-1',
    );
  });

  it('should preserve an edited reconfiguration selection when the selector remounts', () => {
    const originalSecret = {
      uuid: 'original-db',
      name: 'original-db',
      data: { MILVUS_URI: 'milvus://original' },
      invalid: false,
    };
    const ControlledSelector = () => {
      const [selectedSecret, setSelectedSecret] = React.useState<SecretSelection | undefined>(
        originalSecret,
      );
      const [renderKey, setRenderKey] = React.useState(0);

      return (
        <>
          <button data-testid="remount-selector" onClick={() => setRenderKey((key) => key + 1)}>
            Remount
          </button>
          <AutoragVectorStoreSelector
            key={renderKey}
            selectedSecret={selectedSecret}
            onSelectedSecretChange={setSelectedSecret}
          />
        </>
      );
    };

    render(
      <FormWrapper>
        <ControlledSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('database-secret-selector'));
    fireEvent.click(screen.getByTestId('remount-selector'));

    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-selected-value',
      'vector-db-1',
    );
  });
});
