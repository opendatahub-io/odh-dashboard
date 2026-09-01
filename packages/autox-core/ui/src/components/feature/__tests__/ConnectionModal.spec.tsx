import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { mockConnectionTypeConfigMapObj } from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import * as secretsApi from '@odh-dashboard/internal/api/k8s/secrets';
import ConnectionModal from '../ConnectionModal';

jest.mock('@odh-dashboard/internal/api/k8s/secrets', () => ({ createSecret: jest.fn() }));

const createSecretMock = jest.mocked(secretsApi.createSecret);
const connectionTypes = [mockConnectionTypeConfigMapObj({ name: 'the only type', fields: [] })];

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof ConnectionModal>> = {},
  onSubmit = jest.fn(),
) => {
  const props = {
    onOutcome: jest.fn(),
    getCreateError: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
    getSubmitError: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
    ...overrides,
  };
  render(
    <ConnectionModal
      connectionTypes={connectionTypes}
      project="my-project"
      onClose={jest.fn()}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return props;
};

describe('ConnectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  it('should report injected success and cancel outcomes', async () => {
    const onClose = jest.fn();
    const onOutcome = jest.fn();
    const onSubmit = jest.fn();
    render(
      <ConnectionModal
        connectionTypes={connectionTypes}
        project="my-project"
        onClose={onClose}
        onSubmit={onSubmit}
        onOutcome={onOutcome}
        getCreateError={(error) => new Error(String(error))}
        getSubmitError={(error) => new Error(String(error))}
      />,
    );

    await userEvent
      .setup()
      .type(screen.getByRole('textbox', { name: 'Connection name' }), 'my-conn');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add connection' }));
    expect(onOutcome).toHaveBeenCalledWith({ outcome: 'submit', success: true });
    expect(onClose).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOutcome).toHaveBeenCalledTimes(1);
  });

  it('should use the injected create failure and allow a retry after creation failure', async () => {
    createSecretMock.mockRejectedValueOnce(new Error('backend detail'));
    const getCreateError = jest.fn(() => new Error('safe create error'));
    const props = renderModal({ getCreateError });
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: 'Connection name' }), 'my-conn');
    await user.click(screen.getByRole('button', { name: 'Add connection' }));
    expect(getCreateError).toHaveBeenCalled();
    expect(screen.getByText('safe create error')).toBeInTheDocument();
    expect(props.onOutcome).toHaveBeenCalledWith({
      outcome: 'submit',
      success: false,
    });
    expect(createSecretMock).toHaveBeenCalledTimes(1);
  });

  it('should lock and reuse the created Secret when submission fails and is retried', async () => {
    const onSubmit = jest.fn().mockRejectedValueOnce(new Error('select failed'));
    const props = renderModal({ retryAlertTitle: 'Retry this connection' }, onSubmit);
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: 'Connection name' }), 'my-conn');
    await user.click(screen.getByRole('button', { name: 'Add connection' }));
    expect(await screen.findByText('select failed')).toBeInTheDocument();
    expect(screen.getByTestId('connection-locked-for-retry-alert')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeDisabled();

    onSubmit.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: 'Add connection' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(props.onOutcome).toHaveBeenCalledTimes(1);
  });

  it('should block duplicate submission and close while Secret creation is pending', async () => {
    let resolveCreate: (() => void) | undefined;
    createSecretMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = () => resolve({} as Awaited<ReturnType<typeof createSecretMock>>);
      }),
    );
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    const props = {
      onOutcome: jest.fn(),
      getCreateError: (error: unknown) => new Error(String(error)),
      getSubmitError: (error: unknown) => new Error(String(error)),
    };
    render(
      <ConnectionModal
        connectionTypes={connectionTypes}
        project="my-project"
        onClose={onClose}
        onSubmit={onSubmit}
        {...props}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Connection name' }), 'my-conn');
    const addButton = screen.getByRole('button', { name: 'Add connection' });
    fireEvent.click(addButton);
    fireEvent.click(addButton);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(createSecretMock).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    resolveCreate?.();
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
