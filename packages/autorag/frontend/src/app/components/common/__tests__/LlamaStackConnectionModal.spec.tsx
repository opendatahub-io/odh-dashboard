import * as secretsApi from '@odh-dashboard/internal/api/k8s/secrets';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import LlamaStackConnectionModal from '~/app/components/common/LlamaStackConnectionModal';

const TEST_NAMESPACE = 'my-namespace';

jest.mock('@odh-dashboard/internal/api/k8s/secrets', () => ({
  createSecret: jest.fn(),
}));

const createSecretMock = jest.mocked(secretsApi.createSecret);

describe('LlamaStackConnectionModal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  it('should render the modal with all fields', () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Add Llama Stack connection' })).toBeInTheDocument();
    expect(screen.getByTestId('lls-connection-name')).toBeInTheDocument();
    expect(screen.getByTestId('lls-connection-base-url')).toBeInTheDocument();
    expect(screen.getByTestId('lls-connection-api-key')).toBeInTheDocument();
  });

  it('should render the description text', () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    expect(
      screen.getByText(/Provide credentials for accessing an external Llama Stack server/i),
    ).toBeInTheDocument();
  });

  it('should have Add connection button disabled initially', () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should enable Add connection button when name and base URL are filled', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    expect(addButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(screen.getByTestId('lls-connection-name'), {
        target: { value: 'My Connection' },
      });
      fireEvent.change(screen.getByTestId('lls-connection-base-url'), {
        target: { value: 'http://localhost:8080' },
      });
    });

    expect(addButton).toBeEnabled();
  });

  it('should not require API key to enable submit', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('lls-connection-name'), {
        target: { value: 'My Connection' },
      });
      fireEvent.change(screen.getByTestId('lls-connection-base-url'), {
        target: { value: 'http://localhost:8080' },
      });
    });

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    expect(addButton).toBeEnabled();

    await act(async () => {
      addButton.click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stringData: expect.objectContaining({
          LLAMA_STACK_CLIENT_BASE_URL: 'http://localhost:8080',
          LLAMA_STACK_CLIENT_API_KEY: '',
        }),
      }),
    );
  });

  it('should create secret with correct data when all fields are filled', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('lls-connection-name'), {
        target: { value: 'My Connection' },
      });
      fireEvent.change(screen.getByTestId('lls-connection-base-url'), {
        target: { value: 'http://localhost:8080' },
      });
      fireEvent.change(screen.getByTestId('lls-connection-api-key'), {
        target: { value: 'my-api-key' },
      });
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add connection' }).click();
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: expect.objectContaining({
          name: 'my-connection',
          namespace: TEST_NAMESPACE,
          annotations: expect.objectContaining({
            'openshift.io/display-name': 'My Connection',
          }),
        }),
        stringData: {
          LLAMA_STACK_CLIENT_BASE_URL: 'http://localhost:8080',
          LLAMA_STACK_CLIENT_API_KEY: 'my-api-key',
        },
      }),
    );
    expect(onSubmitMock).toHaveBeenCalledWith('my-connection');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should call onClose when cancel is clicked', async () => {
    render(
      <LlamaStackConnectionModal
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

  it('should not call onSubmit when createSecret rejects', async () => {
    createSecretMock.mockRejectedValueOnce(new Error('API error'));

    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('lls-connection-name'), {
        target: { value: 'My Connection' },
      });
      fireEvent.change(screen.getByTestId('lls-connection-base-url'), {
        target: { value: 'http://localhost:8080' },
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
    expect(alert).toHaveTextContent('API error');
  });

  it('should keep button disabled when only name is filled', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('lls-connection-name'), {
        target: { value: 'My Connection' },
      });
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should keep button disabled when only base URL is filled', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('lls-connection-base-url'), {
        target: { value: 'http://localhost:8080' },
      });
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should keep button disabled when base URL is invalid', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('lls-connection-name'), {
        target: { value: 'My Connection' },
      });
      fireEvent.change(screen.getByTestId('lls-connection-base-url'), {
        target: { value: 'not-a-url' },
      });
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should show validation error after blurring base URL with invalid value', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const baseUrlInput = screen.getByTestId('lls-connection-base-url');

    await act(async () => {
      fireEvent.change(baseUrlInput, { target: { value: 'not-a-url' } });
      fireEvent.blur(baseUrlInput);
    });

    expect(screen.getByText('Enter a valid URL (e.g. https://example.com).')).toBeInTheDocument();
  });

  it('should clear validation error when base URL is corrected', async () => {
    render(
      <LlamaStackConnectionModal
        namespace={TEST_NAMESPACE}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
      />,
    );

    const baseUrlInput = screen.getByTestId('lls-connection-base-url');

    await act(async () => {
      fireEvent.change(baseUrlInput, { target: { value: 'not-a-url' } });
      fireEvent.blur(baseUrlInput);
    });

    expect(screen.getByText('Enter a valid URL (e.g. https://example.com).')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(baseUrlInput, { target: { value: 'https://example.com' } });
    });

    expect(
      screen.queryByText('Enter a valid URL (e.g. https://example.com).'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('The base URL of the Llama Stack connection.')).toBeInTheDocument();
  });
});
