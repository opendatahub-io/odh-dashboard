import * as secretsApi from '@odh-dashboard/k8s-core/api/secrets';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import MaaSConnectionModal from '~/app/components/common/MaaSConnectionModal';

jest.mock('@odh-dashboard/k8s-core/api/secrets', () => ({ createSecret: jest.fn() }));

const createSecretMock = jest.mocked(secretsApi.createSecret);

describe('MaaSConnectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  it('should reject a Gateway URL containing the MaaS API path', async () => {
    render(<MaaSConnectionModal namespace="test" onClose={jest.fn()} onSubmit={jest.fn()} />);

    await act(async () => {
      fireEvent.change(screen.getByTestId('maas-connection-name'), {
        target: { value: 'Hosted MaaS' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-base-url'), {
        target: { value: 'https://maas.example.com/maas-api' },
      });
      fireEvent.blur(screen.getByTestId('maas-connection-base-url'));
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
  });

  it('should reject an HTTP Gateway URL', async () => {
    render(<MaaSConnectionModal namespace="test" onClose={jest.fn()} onSubmit={jest.fn()} />);

    await act(async () => {
      fireEvent.change(screen.getByTestId('maas-connection-name'), {
        target: { value: 'Hosted MaaS' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-base-url'), {
        target: { value: 'http://maas.example.com' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-api-key'), {
        target: { value: 'secret-key' },
      });
      fireEvent.blur(screen.getByTestId('maas-connection-base-url'));
    });

    expect(screen.getByRole('button', { name: 'Add connection' })).toBeDisabled();
    expect(screen.getByText(/HTTPS origin/)).toBeInTheDocument();
  });

  it('should create a secret containing only the hosted MaaS credentials', async () => {
    const onSubmit = jest.fn();
    render(<MaaSConnectionModal namespace="test" onClose={jest.fn()} onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.change(screen.getByTestId('maas-connection-name'), {
        target: { value: 'Hosted MaaS' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-base-url'), {
        target: { value: 'https://maas.example.com' },
      });
      fireEvent.change(screen.getByTestId('maas-connection-api-key'), {
        target: { value: 'secret-key' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add connection' }));
    });

    expect(createSecretMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ name: 'hosted-maas', namespace: 'test' }),
        stringData: { MAAS_BASE_URL: 'https://maas.example.com', MAAS_API_KEY: 'secret-key' },
      }),
    );
    expect(onSubmit).toHaveBeenCalledWith('hosted-maas');
  });
});
