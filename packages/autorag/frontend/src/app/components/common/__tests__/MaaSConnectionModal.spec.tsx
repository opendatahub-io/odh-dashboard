import * as secretsApi from '@odh-dashboard/k8s-core/api/secrets';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import MaaSConnectionModal from '~/app/components/common/MaaSConnectionModal';

const TEST_NAMESPACE = 'my-namespace';

jest.mock('@odh-dashboard/k8s-core/api/secrets', () => ({
  createSecret: jest.fn(),
}));

const createSecretMock = jest.mocked(secretsApi.createSecret);

describe('MaaSConnectionModal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  const renderModal = () =>
    render(
      <MaaSConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

  it('should render MaaS fields', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Add MaaS connection' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Provide credentials for accessing an external Models as a Service (MaaS) server. The generation and embedding models registered in the MaaS server will be considered when generating RAG patterns. Vector I/O providers in the MaaS server can be used to create a collection for retrieval.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('maas-connection-name')).toBeInTheDocument();
    expect(screen.getByTestId('maas-connection-base-url')).toBeInTheDocument();
    expect(screen.getByTestId('maas-connection-api-key')).toBeInTheDocument();
    expect(screen.getByText('Connection name')).toBeInTheDocument();
    expect(screen.getByText('Base URL')).toBeInTheDocument();
    expect(screen.getByText('API key')).toBeInTheDocument();
  });

  it('should require the base URL and API key', async () => {
    renderModal();
    const addButton = screen.getByRole('button', { name: 'Add connection' });
    expect(addButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(screen.getByTestId('maas-connection-name'), {
        target: { value: 'MaaS connection' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-base-url'), {
        target: { value: 'https://maas.example.com' },
      });
    });
    expect(addButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(screen.getByTestId('maas-connection-api-key'), {
        target: { value: 'test-key' },
      });
    });
    expect(addButton).toBeEnabled();
    expect(screen.getByText('The base URL of the MaaS connection.')).toBeInTheDocument();
  });

  it('should create a MaaS Secret and submit its name', async () => {
    renderModal();

    await act(async () => {
      fireEvent.change(screen.getByTestId('maas-connection-name'), {
        target: { value: 'MaaS connection' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-base-url'), {
        target: { value: 'https://maas.example.com' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-api-key'), {
        target: { value: 'test-key' },
      });
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ name: 'maas-connection', namespace: TEST_NAMESPACE }),
        stringData: {
          MAAS_BASE_URL: 'https://maas.example.com',
          MAAS_API_KEY: 'test-key',
        },
      }),
    );
    expect(onSubmitMock).toHaveBeenCalledWith('maas-connection');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should reject an invalid URL', async () => {
    renderModal();

    await act(async () => {
      fireEvent.change(screen.getByTestId('maas-connection-name'), {
        target: { value: 'MaaS connection' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-base-url'), {
        target: { value: 'not-a-url' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-api-key'), {
        target: { value: 'test-key' },
      });
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });
});
