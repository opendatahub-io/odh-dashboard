import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import type { SecretSelection } from '@odh-dashboard/autox-core/ui/components/feature';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';

let mockVectorModalOnSubmit: ((name: string) => Promise<void>) | undefined;
let mockVectorRefresh: () => Promise<SecretListItem[] | undefined> = async () => [];

jest.mock('~/app/components/common/VectorDbConnectionModal', () => ({
  __esModule: true,
  default: ({
    onSubmit,
    initialProvider,
  }: {
    onSubmit: (name: string) => Promise<void>;
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
    provider,
    value,
    onRefreshReady,
  }: {
    onChange: (value: unknown) => void;
    dataTestId: string;
    type: string;
    provider?: string;
    value?: string;
    onRefreshReady?: (refresh: () => Promise<SecretListItem[] | undefined>) => void;
  }) => {
    onRefreshReady?.(mockVectorRefresh);
    return (
      <button
        data-testid={dataTestId}
        data-secret-type={type}
        data-secret-provider={provider}
        data-selected-value={value}
        onClick={() =>
          onChange({
            uuid: provider === 'neo4j' ? 'neo4j-1' : 'vector-db-1',
            name: provider === 'neo4j' ? 'neo4j-secret' : 'vector-db-secret',
            data: provider === 'neo4j' ? { NEO4J_URI: 'neo4j://example' } : {},
            invalid: false,
          })
        }
      >
        Select vector database secret
      </button>
    );
  },
}));

const schema = createConfigureSchema();
const mockUseParams = jest.mocked(useParams);

const FormWrapper: React.FC<{
  children: React.ReactNode;
  onChange?: (values: typeof schema.defaults) => void;
}> = ({ children, onChange }) => {
  const form = useForm({
    mode: 'onChange',
    defaultValues: schema.defaults,
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
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  it('should query the existing vector-db Secret filter for Simple RAG', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-secret-type',
      'vector-db',
    );
    expect(screen.getByTestId('database-secret-selector')).not.toHaveAttribute(
      'data-secret-provider',
    );
  });

  it('should render labeled, non-required RAG template radios with descriptions', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    expect(screen.getByRole('radiogroup', { name: 'RAG template' })).toBeInTheDocument();
    expect(screen.getByTestId('autorag-rag-mode-simple')).toHaveAccessibleName('Simple RAG');
    expect(screen.getByTestId('autorag-rag-mode-graph')).toHaveAccessibleName('Graph RAG');
    expect(screen.getByText('Uses a Milvus or PGVector database connection.')).toBeInTheDocument();
    expect(screen.getByText('Uses a Neo4j database connection.')).toBeInTheDocument();
    expect(screen.getByText('RAG template').closest('label')).not.toHaveAttribute('for');
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

  it('should offer Milvus and PGVector creation options', async () => {
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
  });

  it('should switch to Graph RAG and open Neo4j creation directly', async () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('autorag-rag-mode-graph'));
    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-secret-type',
      'database',
    );
    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-secret-provider',
      'neo4j',
    );
    expect(screen.queryByTestId('add-database-dropdown-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-database-connection-button')).toHaveTextContent(
      'Add Neo4j connection',
    );
    fireEvent.click(screen.getByTestId('add-database-connection-button'));
    expect(screen.getByTestId('vector-db-modal')).toHaveAttribute('data-initial-provider', 'neo4j');
  });

  it('should clear the database selection when changing RAG mode', () => {
    let values: typeof schema.defaults | undefined;
    render(
      <FormWrapper onChange={(nextValues) => (values = nextValues)}>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('database-secret-selector'));
    expect(values?.db_secret_name).toBe('vector-db-secret');
    fireEvent.click(screen.getByTestId('autorag-rag-mode-graph'));
    expect(values?.db_secret_name).toBe('');
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

  it('should reject creation when the new vector database Secret is missing after refresh', async () => {
    mockVectorRefresh = async () => [];
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-database-connection-button'));
    await expect(mockVectorModalOnSubmit?.('new-vector-db-secret')).rejects.toThrow(
      'not found after refreshing',
    );
    expect(screen.getByTestId('vector-db-modal')).toBeInTheDocument();
  });

  it('should preserve a selected Graph RAG connection when the selector remounts', () => {
    const ControlledSelector = () => {
      const [mode, setMode] = React.useState<'simple' | 'graph'>('simple');
      const [selectedSecret, setSelectedSecret] = React.useState<SecretListItem>();
      const [renderKey, setRenderKey] = React.useState(0);

      return (
        <>
          <button data-testid="remount-selector" onClick={() => setRenderKey((key) => key + 1)}>
            Remount
          </button>
          <AutoragVectorStoreSelector
            key={renderKey}
            mode={mode}
            selectedSecret={selectedSecret}
            onModeChange={setMode}
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

    fireEvent.click(screen.getByTestId('autorag-rag-mode-graph'));
    fireEvent.click(screen.getByTestId('database-secret-selector'));
    fireEvent.click(screen.getByTestId('remount-selector'));

    expect(screen.getByTestId('autorag-rag-mode-graph')).toBeChecked();
    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-secret-provider',
      'neo4j',
    );
    expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
      'data-selected-value',
      'neo4j-1',
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
