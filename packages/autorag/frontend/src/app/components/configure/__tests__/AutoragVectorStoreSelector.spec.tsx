import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';

let mockVectorModalOnSubmit: ((name: string) => Promise<void>) | undefined;
let mockVectorRefresh: () => Promise<SecretListItem[] | undefined> = async () => [];

jest.mock('~/app/components/common/VectorDbConnectionModal', () => ({
  __esModule: true,
  default: ({ onSubmit }: { onSubmit: (name: string) => Promise<void> }) => {
    mockVectorModalOnSubmit = onSubmit;
    return <div data-testid="vector-db-modal" />;
  },
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    dataTestId,
    type,
    onRefreshReady,
  }: {
    onChange: (value: unknown) => void;
    dataTestId: string;
    type: string;
    onRefreshReady?: (refresh: () => Promise<SecretListItem[] | undefined>) => void;
  }) => {
    onRefreshReady?.(mockVectorRefresh);
    return (
      <button
        data-testid={dataTestId}
        data-secret-type={type}
        onClick={() => onChange({ uuid: 'vector-db-1', name: 'vector-db-secret', invalid: false })}
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

  it('should query the strict vector-db Secret filter', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    expect(screen.getByTestId('vector-db-secret-selector')).toHaveAttribute(
      'data-secret-type',
      'vector-db',
    );
  });

  it('should render an action to add a vector database connection', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    expect(screen.getByTestId('add-vector-db-connection-button')).toHaveTextContent(
      'Add new connection',
    );
    expect(screen.getByTestId('add-vector-db-connection-button')).toHaveClass(
      'pf-v6-u-text-nowrap',
    );
    expect(
      screen.getByTestId('add-vector-db-dropdown-toggle').closest('.pf-v6-c-menu-toggle'),
    ).toHaveClass('pf-m-secondary');
  });

  it('should offer Milvus and PGVector creation options', async () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-vector-db-dropdown-toggle'));
    });
    expect(screen.getByTestId('add-milvus-connection-option')).toHaveTextContent(
      'Add Milvus connection',
    );
    expect(screen.getByTestId('add-pgvector-connection-option')).toHaveTextContent(
      'Add PGVector connection',
    );
  });

  it('should store the selected vector database Secret name', () => {
    let values: typeof schema.defaults | undefined;

    render(
      <FormWrapper onChange={(nextValues) => (values = nextValues)}>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('vector-db-secret-selector'));
    expect(values?.vector_db_secret_name).toBe('vector-db-secret');
  });

  it('should reject creation when the new vector database Secret is missing after refresh', async () => {
    mockVectorRefresh = async () => [];
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    fireEvent.click(screen.getByTestId('add-vector-db-connection-button'));
    await expect(mockVectorModalOnSubmit?.('new-vector-db-secret')).rejects.toThrow(
      'not found after refreshing',
    );
    expect(screen.getByTestId('vector-db-modal')).toBeInTheDocument();
  });
});
