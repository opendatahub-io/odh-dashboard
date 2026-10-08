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

const caCertificateGuidance =
  "Optional PEM-encoded CA certificate used to verify the server's TLS certificate. Required when TLS certificate verification is enabled and the server uses a private or self-signed CA. Public-host connections with TLS verification enabled will fail if the required CA certificate is not provided. Leave blank for connections that do not use TLS verification.";

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
      target: { value: ' token ' },
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
          MILVUS_TOKEN: ' token ',
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

  it('should render concise guidance, examples, and field accessibility references', () => {
    renderModal();

    for (const [field, descriptionId] of [
      ['uri', 'milvus-uri-description'],
      ['token', 'milvus-token-description'],
      ['ca-cert', 'milvus-ca-cert-description'],
    ]) {
      const input = screen.getByTestId(`milvus-${field}-input`);
      expect(input).toHaveAttribute('aria-describedby', descriptionId);
      expect(input).not.toHaveAttribute('placeholder');
      expect(input.getAttribute('placeholder') ?? '').not.toMatch(/(?:for )?example:/i);
    }
    expect(document.getElementById('milvus-ca-cert-description')).toHaveTextContent(
      caCertificateGuidance,
    );
    expect(document.getElementById('milvus-uri-description')).toHaveTextContent(
      'Milvus server endpoint, including protocol and port (for example: "http://localhost:19530" or "https://milvus.example.com:19530").',
    );
    expect(document.getElementById('milvus-token-description')).toHaveTextContent(
      'Authentication token in the format "username:password". Leave blank if authentication is disabled.',
    );
    expect(screen.queryByText(/Example Secret:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/MILVUS_/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('vector-db-provider-pgvector'));
    for (const [field, descriptionId] of [
      ['host', 'pgvector_host-description'],
      ['port', 'pgvector_port-description'],
      ['db', 'pgvector_db-description'],
      ['user', 'pgvector_user-description'],
      ['password', 'pgvector_password-description'],
    ]) {
      const input = screen.getByTestId(`pgvector-${field}-input`);
      expect(input).toHaveAttribute('aria-describedby', descriptionId);
      expect(input).not.toHaveAttribute('placeholder');
      expect(input.getAttribute('placeholder') ?? '').not.toMatch(/(?:for )?example:/i);
    }
    expect(document.getElementById('pgvector_host-description')).toHaveTextContent(
      'PostgreSQL server hostname or IP address (for example: "db.example.com" or "10.0.0.5").',
    );
    expect(document.getElementById('pgvector_port-description')).toHaveTextContent(
      'PostgreSQL port number. Usually "5432" unless your provider specifies a different port.',
    );
    expect(document.getElementById('pgvector_db-description')).toHaveTextContent(
      'Name of the PostgreSQL database that contains your pgvector tables and embeddings.',
    );
    expect(document.getElementById('pgvector_user-description')).toHaveTextContent(
      'PostgreSQL user account used to connect to the database.',
    );
    expect(document.getElementById('pgvector_password-description')).toHaveTextContent(
      'Password for the PostgreSQL user account.',
    );
    expect(screen.getByTestId('pgvector-ca-cert-input')).toHaveAttribute(
      'aria-describedby',
      'pgvector-ca-cert-description',
    );
    expect(document.getElementById('pgvector-ca-cert-description')).toHaveTextContent(
      caCertificateGuidance,
    );
    expect(screen.queryByText(/Example Secret:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PGVECTOR_/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('vector-db-provider-neo4j'));
    for (const [field, descriptionId] of [
      ['uri', 'neo4j-uri-description'],
      ['database', 'neo4j_database-description'],
      ['username', 'neo4j_username-description'],
      ['password', 'neo4j-password-description'],
      ['ca-cert', 'neo4j-ca-cert-description'],
    ]) {
      expect(screen.getByTestId(`neo4j-${field}-input`)).toHaveAttribute(
        'aria-describedby',
        descriptionId,
      );
    }
    for (const field of ['uri', 'database', 'username', 'password', 'ca-cert']) {
      const input = screen.getByTestId(`neo4j-${field}-input`);
      expect(input).not.toHaveAttribute('placeholder');
      expect(input.getAttribute('placeholder') ?? '').not.toMatch(/(?:for )?example:/i);
    }
    expect(document.getElementById('neo4j-uri-description')).toHaveTextContent(
      'Neo4j connection URI, including protocol and host (for example: "neo4j+s://example.databases.neo4j.io" or "bolt://localhost:7687").',
    );
    expect(document.getElementById('neo4j_database-description')).toHaveTextContent(
      'Name of the Neo4j database to connect to. Leave blank to use the default database configured for the user.',
    );
    expect(document.getElementById('neo4j_username-description')).toHaveTextContent(
      'Neo4j username used for authentication.',
    );
    expect(document.getElementById('neo4j-ca-cert-description')).toHaveTextContent(
      caCertificateGuidance,
    );
    expect(document.getElementById('neo4j-password-description')).toHaveTextContent(
      'Password for the specified Neo4j user account.',
    );
    expect(screen.queryByText(/Example Secret:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NEO4J_/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Optional\./)).not.toBeInTheDocument();
  });

  it('should preserve static guidance when a validation error is shown', () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="pgvector"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByTestId('pgvector-host-input'), { target: { value: 'host' } });
    fireEvent.change(screen.getByTestId('pgvector-host-input'), { target: { value: '' } });

    expect(screen.getByTestId('pgvector-host-input')).toHaveAttribute(
      'aria-describedby',
      'pgvector_host-description pgvector_host-error',
    );
    expect(document.getElementById('pgvector_host-description')).toBeInTheDocument();
    expect(document.getElementById('pgvector_host-error')).toHaveTextContent(
      'This field is required',
    );
  });

  it('should render Neo4j database before username', () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="neo4j"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen
        .getByTestId('neo4j-database-input')
        .compareDocumentPosition(screen.getByTestId('neo4j-username-input')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('should not show required field errors until a field is edited', () => {
    render(
      <VectorDbConnectionModal
        namespace="test-namespace"
        initialProvider="pgvector"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('pgvector-host-input'), { target: { value: 'host' } });
    fireEvent.change(screen.getByTestId('pgvector-host-input'), { target: { value: '' } });
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it.each(['milvus', 'pgvector', 'neo4j'] as const)(
    'should render a field-level error for whitespace-only %s CA values',
    (provider) => {
      render(
        <VectorDbConnectionModal
          namespace="test-namespace"
          initialProvider={provider}
          onClose={onClose}
          onSubmit={onSubmit}
        />,
      );
      fillName();
      if (provider === 'pgvector') {
        for (const [field, value] of [
          ['host', 'postgres.example.com'],
          ['port', '5432'],
          ['db', 'rag'],
          ['user', 'rag-user'],
          ['password', 'secret'],
        ]) {
          fireEvent.change(screen.getByTestId(`pgvector-${field}-input`), { target: { value } });
        }
      } else if (provider === 'neo4j') {
        fireEvent.change(screen.getByTestId('neo4j-uri-input'), {
          target: { value: 'neo4j://neo4j.example.com:7687' },
        });
        fireEvent.change(screen.getByTestId('neo4j-password-input'), {
          target: { value: 'secret' },
        });
      } else {
        fireEvent.change(screen.getByTestId('milvus-uri-input'), {
          target: { value: 'https://milvus.example.com' },
        });
      }

      fireEvent.change(screen.getByTestId(`${provider}-ca-cert-input`), {
        target: { value: '   ' },
      });

      expect(screen.getByText('CA certificate cannot be blank')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
    },
  );

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
    expect(screen.getByTestId('pgvector-host-input')).not.toHaveAttribute('placeholder');
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
      ['password', ' secret '],
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
          PGVECTOR_PASSWORD: ' secret ',
        },
      }),
    );
    expect(createSecretMock.mock.calls[0][0].stringData).not.toHaveProperty('MILVUS_URI');
  });

  it('should trim and create the PGVector CA key', async () => {
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
      ['port', '5432'],
      ['db', 'rag'],
      ['user', 'rag-user'],
      ['password', ' secret '],
    ]) {
      fireEvent.change(screen.getByTestId(`pgvector-${field}-input`), { target: { value } });
    }
    fireEvent.change(screen.getByTestId('pgvector-ca-cert-input'), {
      target: { value: '  arbitrary CA text  ' },
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock.mock.calls[0][0].stringData).toMatchObject({
      PGVECTOR_CA_CERT: 'arbitrary CA text',
    });
  });

  it('should trim and create the canonical Milvus CA key', async () => {
    renderModal();
    fillName();
    fireEvent.change(screen.getByTestId('milvus-uri-input'), {
      target: { value: ' https://milvus.example.com ' },
    });
    fireEvent.change(screen.getByTestId('milvus-ca-cert-input'), {
      target: { value: '  arbitrary CA text  ' },
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock.mock.calls[0][0].stringData).toEqual({
      MILVUS_URI: 'https://milvus.example.com',
      MILVUS_CA_CERT: 'arbitrary CA text',
    });
    expect(createSecretMock.mock.calls[0][0].stringData).not.toHaveProperty('MILVUS_SERVER_CERT');
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
    fireEvent.change(screen.getByTestId('neo4j-password-input'), {
      target: { value: ' secret ' },
    });
    fireEvent.change(screen.getByTestId('neo4j-database-input'), { target: { value: 'graph' } });
    fireEvent.change(screen.getByTestId('neo4j-ca-cert-input'), {
      target: { value: '  arbitrary CA text  ' },
    });

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
          NEO4J_PASSWORD: ' secret ',
          NEO4J_DATABASE: 'graph',
          NEO4J_CA_CERT: 'arbitrary CA text',
        },
      }),
    );
  });

  it('should omit blank Neo4j username and database from the created Secret', async () => {
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
    fireEvent.change(screen.getByTestId('neo4j-password-input'), { target: { value: 'secret' } });
    fireEvent.change(screen.getByTestId('neo4j-username-input'), { target: { value: '   ' } });
    fireEvent.change(screen.getByTestId('neo4j-database-input'), { target: { value: '\t' } });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock.mock.calls[0][0].stringData).toEqual({
      NEO4J_URI: 'neo4j://neo4j.example.com:7687',
      NEO4J_PASSWORD: 'secret',
    });
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
    fireEvent.change(screen.getByTestId('neo4j-password-input'), { target: { value: 'secret' } });

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
    fireEvent.change(screen.getByTestId('neo4j-password-input'), { target: { value: 'secret' } });

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
