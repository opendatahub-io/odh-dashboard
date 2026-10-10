import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import { useCreateSecretMutation } from '@odh-dashboard/autox-core/ui/hooks';
import VectorDbConnectionModal from '~/app/components/common/VectorDbConnectionModal';

jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  useCreateSecretMutation: jest.fn(),
}));

const createSecretMock = jest.fn();
const useCreateSecretMutationMock = jest.mocked(useCreateSecretMutation);

describe('VectorDbConnectionModal', () => {
  const onClose = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({});
    useCreateSecretMutationMock.mockReturnValue({ mutateAsync: createSecretMock } as never);
  });

  const renderModal = () =>
    render(
      <VectorDbConnectionModal namespace="test-namespace" onClose={onClose} onSubmit={onSubmit} />,
    );

  const fillName = () =>
    fireEvent.change(screen.getByTestId('vector-db-connection-name'), {
      target: { value: 'Vector DB connection' },
    });

  it('should create a Milvus Secret with only Milvus fields', async () => {
    renderModal();
    fillName();
    fireEvent.click(screen.getByTestId('vector-db-provider-milvus'));
    fireEvent.change(screen.getByTestId('milvus-uri-input'), {
      target: { value: 'https://milvus.example.com' },
    });
    fireEvent.change(screen.getByTestId('milvus-token-input'), {
      target: { value: 'token' },
    });
    expect(screen.getByTestId('milvus-token-input')).toHaveAttribute('type', 'password');

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          annotations: expect.not.objectContaining({
            'openshift.io/description': expect.anything(),
          }),
        }),
        stringData: {
          MILVUS_URI: 'https://milvus.example.com',
          MILVUS_TOKEN: 'token',
        },
      }),
    );
    expect(createSecretMock.mock.calls[0][0].stringData).not.toHaveProperty('PGVECTOR_HOST');
  });

  it('should default to Milvus and place provider selection before connection fields', () => {
    renderModal();

    expect(screen.getByTestId('vector-db-provider-milvus')).toBeChecked();
    expect(screen.getByTestId('vector-db-provider-pgvector')).not.toBeChecked();
    expect(screen.getByRole('heading', { name: 'Add Milvus connection' })).toBeInTheDocument();
    expect(
      screen
        .getByTestId('vector-db-provider-milvus')
        .compareDocumentPosition(screen.getByTestId('vector-db-connection-name')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('URI')).toBeInTheDocument();
    expect(screen.getByText('Token')).toBeInTheDocument();
    expect(screen.getByText('CA certificate')).toBeInTheDocument();
    expect(screen.getByTestId('milvus-ca-cert-input').tagName).toBe('TEXTAREA');
    expect(screen.getByText('Vector database type')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Add Milvus connection' }).textContent,
    ).not.toContain('conneciton');
    expect(screen.queryByTestId('vector-db-connection-description')).not.toBeInTheDocument();
  });

  it('should toggle Milvus token visibility without changing its value', async () => {
    renderModal();
    fireEvent.change(screen.getByTestId('milvus-token-input'), {
      target: { value: 'token' },
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Show token' }).click();
    });
    expect(screen.getByTestId('milvus-token-input')).toHaveAttribute('type', 'text');
    expect(screen.getByTestId('milvus-token-input')).toHaveValue('token');

    await act(async () => {
      screen.getByRole('button', { name: 'Hide token' }).click();
    });
    expect(screen.getByTestId('milvus-token-input')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('milvus-token-input')).toHaveValue('token');
  });

  it('should honor a PGVector preselection and show user-friendly labels', () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="pgvector"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByTestId('vector-db-provider-pgvector')).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Add PGVector connection' })).toBeInTheDocument();
    expect(screen.getByText('Vector database type')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(
      screen.getByText(
        'DNS hostname of the PostgreSQL server. Literal IP addresses are not supported.',
      ),
    ).toBeInTheDocument();
  });

  it('should create a PGVector Secret with only PGVector fields', async () => {
    renderModal();
    fillName();
    fireEvent.click(screen.getByTestId('vector-db-provider-pgvector'));

    for (const [field, value] of [
      ['host', 'postgres.example.com'],
      ['port', '5432'],
      ['db', 'rag'],
      ['user', 'rag-user'],
      ['password', 'secret'],
    ]) {
      fireEvent.change(screen.getByTestId(`pgvector-${field}-input`), { target: { value } });
    }

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stringData: {
          PGVECTOR_HOST: 'postgres.example.com',
          PGVECTOR_PORT: '5432',
          PGVECTOR_DB: 'rag',
          PGVECTOR_USER: 'rag-user',
          PGVECTOR_PASSWORD: 'secret',
        },
      }),
    );
    expect(createSecretMock.mock.calls[0][0].stringData).not.toHaveProperty('MILVUS_URI');
  });

  it('should reject PGVector ports outside the valid integer range', () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="pgvector"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    fillName();
    for (const [field, value] of [
      ['host', 'postgres.example.com'],
      ['port', '65536'],
      ['db', 'rag'],
      ['user', 'rag-user'],
      ['password', 'secret'],
    ]) {
      fireEvent.change(screen.getByTestId(`pgvector-${field}-input`), { target: { value } });
    }
    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('pgvector-port-input'), { target: { value: '5432.5' } });
    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('pgvector-port-input'), { target: { value: '5432' } });
    expect(screen.getByRole('button', { name: 'Add connection' })).toBeEnabled();
  });

  it('should create a generic Neo4j database Secret with optional fields', async () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="neo4j"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    fillName();
    fireEvent.change(screen.getByTestId('neo4j-uri-input'), {
      target: { value: 'neo4j://neo4j.example.com:7687' },
    });
    fireEvent.change(screen.getByTestId('neo4j-username-input'), { target: { value: 'neo4j' } });
    fireEvent.change(screen.getByTestId('neo4j-password-input'), { target: { value: 'secret' } });
    fireEvent.change(screen.getByTestId('neo4j-database-input'), { target: { value: 'graph' } });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          annotations: expect.objectContaining({
            'opendatahub.io/connection-type': 'database',
            'opendatahub.io/database-provider': 'neo4j',
          }),
        }),
        stringData: {
          NEO4J_URI: 'neo4j://neo4j.example.com:7687',
          NEO4J_USERNAME: 'neo4j',
          NEO4J_PASSWORD: 'secret',
          NEO4J_DATABASE: 'graph',
        },
      }),
    );
  });

  it('should omit the provider selector when Neo4j is the only allowed provider', () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="neo4j"
        allowedProviders={['neo4j']}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByTestId('vector-db-provider-neo4j')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vector-db-provider-milvus')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vector-db-provider-pgvector')).not.toBeInTheDocument();
    expect(screen.queryByText('Vector database type')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Neo4j connection' })).toBeInTheDocument();
    expect(screen.getByTestId('neo4j-uri-input')).toBeInTheDocument();
  });

  it('should reject Neo4j URIs without a hostname', () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="neo4j"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    fillName();
    fireEvent.change(screen.getByTestId('neo4j-uri-input'), { target: { value: 'neo4j:///' } });
    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it.each([
    'neo4j://neo4j.example.com:7687',
    'neo4j+s://neo4j.example.com:7687',
    'bolt://neo4j.example.com:7687',
    'bolt+s://neo4j.example.com:7687',
  ])('should accept Neo4j URI %s', (value) => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="neo4j"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    fillName();
    fireEvent.change(screen.getByTestId('neo4j-uri-input'), { target: { value } });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeEnabled();
  });

  it.each([
    'neo4j:///',
    'neo4j+s:///',
    'bolt:///',
    'bolt+s:///',
    'neo4j://[',
    'https://neo4j.example.com',
  ])('should reject invalid Neo4j URI %s', (value) => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="neo4j"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    fillName();
    fireEvent.change(screen.getByTestId('neo4j-uri-input'), { target: { value } });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should preserve whitespace in a non-empty Neo4j password', async () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="neo4j"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    fillName();
    fireEvent.change(screen.getByTestId('neo4j-uri-input'), {
      target: { value: 'neo4j://neo4j.example.com:7687' },
    });
    fireEvent.change(screen.getByTestId('neo4j-password-input'), {
      target: { value: ' secret ' },
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock.mock.calls[0][0].stringData).toMatchObject({
      NEO4J_PASSWORD: ' secret ',
    });
  });
});
