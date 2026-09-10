import * as secretsApi from '@odh-dashboard/k8s-core/api/secrets';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import VectorDbConnectionModal from '~/app/components/common/VectorDbConnectionModal';

const TEST_NAMESPACE = 'my-namespace';

jest.mock('@odh-dashboard/k8s-core/api/secrets', () => ({
  createSecret: jest.fn(),
}));

const createSecretMock = jest.mocked(secretsApi.createSecret);

describe('VectorDbConnectionModal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  it('should render Milvus fields by default', () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Add Milvus connection' })).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-connection-name')).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-milvus-uri')).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-milvus-token')).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-milvus-server-cert')).toBeInTheDocument();
    expect(screen.queryByTestId('vector-db-pgvector-host')).not.toBeInTheDocument();
  });

  it('should render PGVector fields when initialBackend is pgvector', () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        initialBackend="pgvector"
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Add PGVector connection' })).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-pgvector-host')).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-pgvector-port')).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-pgvector-db')).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-pgvector-user')).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-pgvector-password')).toBeInTheDocument();
    expect(screen.queryByTestId('vector-db-milvus-uri')).not.toBeInTheDocument();
  });

  it('should switch schemas when the backend radio changes', async () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('vector-db-backend-pgvector'));
    });

    expect(screen.getByRole('heading', { name: 'Add PGVector connection' })).toBeInTheDocument();
    expect(screen.getByTestId('vector-db-pgvector-host')).toBeInTheDocument();
  });

  it('should have Add connection button disabled initially', () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should create a Milvus secret with required URI and optional token', async () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('vector-db-connection-name'), {
        target: { value: 'My Milvus' },
      });
      fireEvent.change(screen.getByTestId('vector-db-milvus-uri'), {
        target: { value: 'http://milvus:19530' },
      });
      fireEvent.change(screen.getByTestId('vector-db-milvus-token'), {
        target: { value: 'token-123' },
      });
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeEnabled();

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'my-milvus',
          namespace: TEST_NAMESPACE,
          annotations: expect.objectContaining({
            'openshift.io/display-name': 'My Milvus',
            'opendatahub.io/connection-type': 'milvus',
          }),
          labels: expect.objectContaining({
            [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          }),
        }),
        stringData: {
          MILVUS_URI: 'http://milvus:19530',
          MILVUS_TOKEN: 'token-123',
        },
      }),
    );
    expect(onSubmitMock).toHaveBeenCalledWith('my-milvus');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should create a PGVector secret with all required keys', async () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        initialBackend="pgvector"
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('vector-db-connection-name'), {
        target: { value: 'My PGVector' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-host'), {
        target: { value: 'pg.example.com' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-port'), {
        target: { value: '5432' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-db'), {
        target: { value: 'testdb' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-user'), {
        target: { value: 'testuser' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-password'), {
        target: { value: 'secret' },
      });
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'my-pgvector',
          annotations: expect.objectContaining({
            'opendatahub.io/connection-type': 'pgvector',
          }),
        }),
        stringData: {
          PGVECTOR_HOST: 'pg.example.com',
          PGVECTOR_PORT: '5432',
          PGVECTOR_DB: 'testdb',
          PGVECTOR_USER: 'testuser',
          PGVECTOR_PASSWORD: 'secret',
        },
      }),
    );
    expect(onSubmitMock).toHaveBeenCalledWith('my-pgvector');
  });

  it('should keep submit disabled when PGVector port is invalid', async () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        initialBackend="pgvector"
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('vector-db-connection-name'), {
        target: { value: 'My PGVector' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-host'), {
        target: { value: 'pg.example.com' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-port'), {
        target: { value: '99999' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-db'), {
        target: { value: 'testdb' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-user'), {
        target: { value: 'testuser' },
      });
      fireEvent.change(screen.getByTestId('vector-db-pgvector-password'), {
        target: { value: 'secret' },
      });
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should not call onSubmit when createSecret rejects', async () => {
    createSecretMock.mockRejectedValueOnce(new Error('API error'));

    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('vector-db-connection-name'), {
        target: { value: 'My Milvus' },
      });
      fireEvent.change(screen.getByTestId('vector-db-milvus-uri'), {
        target: { value: 'http://milvus:19530' },
      });
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
    const alert = await screen.findByTestId('error-message-alert');
    expect(alert).toHaveTextContent('Failed to create connection');
  });

  it('should call onClose when cancel is clicked', async () => {
    render(
      <VectorDbConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Cancel' }).click();
    });

    expect(onCloseMock).toHaveBeenCalled();
  });
});
