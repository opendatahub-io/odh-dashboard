import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import { useCreateSecretMutation } from '@odh-dashboard/autox-core/ui/hooks';
import type { SecretListItem } from '~/app/types';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  useCreateSecretMutation: jest.fn(),
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('@odh-dashboard/autox-core/ui/components/feature', () => ({
  __esModule: true,
  SecretSelector: ({
    onRefreshReady,
    dataTestId,
    value,
  }: {
    onRefreshReady?: (refresh: () => Promise<SecretListItem[] | undefined>) => void;
    dataTestId: string;
    value?: string;
  }) => {
    onRefreshReady?.(mockVectorRefresh);
    return <div data-testid={dataTestId} data-selected-value={value} />;
  },
}));

const schema = createConfigureSchema();
const mockUseParams = jest.mocked(useParams);
const createSecretMock = jest.fn();
const useCreateSecretMutationMock = jest.mocked(useCreateSecretMutation);
let mockVectorRefresh: () => Promise<SecretListItem[] | undefined> = async () => [];

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    defaultValues: schema.defaults,
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('AutoragVectorStoreSelector provider switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    createSecretMock.mockResolvedValue({});
    useCreateSecretMutationMock.mockReturnValue({ mutateAsync: createSecretMock } as never);
    mockVectorRefresh = async () => [
      {
        name: 'pgvector-connection',
        uuid: 'pgvector-connection',
        data: { PGVECTOR_HOST: '[REDACTED]' },
        databaseProviders: ['pgvector'],
      },
    ];
  });

  it('should select a Secret for the provider chosen in the modal', async () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId('add-database-dropdown-toggle'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Milvus connection' }));
    fireEvent.click(screen.getByTestId('vector-db-provider-pgvector'));
    fireEvent.change(screen.getByTestId('vector-db-connection-name'), {
      target: { value: 'PGVector connection' },
    });
    for (const [field, value] of [
      ['host', 'postgres.example.com'],
      ['port', '5432'],
      ['db', 'rag'],
      ['user', 'rag-user'],
      ['password', 'secret'],
    ]) {
      fireEvent.change(screen.getByTestId(`pgvector-${field}-input`), { target: { value } });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Add connection' }));

    await waitFor(() => expect(createSecretMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('database-secret-selector')).toHaveAttribute(
        'data-selected-value',
        'pgvector-connection',
      ),
    );
    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          annotations: expect.objectContaining({
            'opendatahub.io/vector-db-provider': 'pgvector',
          }),
        }),
      }),
    );
  });
});
