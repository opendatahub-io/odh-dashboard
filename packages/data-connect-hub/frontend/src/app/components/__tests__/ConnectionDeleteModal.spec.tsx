import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteConnection } from '~/app/api/dch';
import ConnectionDeleteModal from '~/app/components/ConnectionDeleteModal';
import type { Connection } from '~/app/types';

jest.mock('~/app/api/dch', () => ({
  deleteConnection: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  DeleteModal: ({
    deleteName,
    error,
    onClose,
    onDelete,
  }: {
    deleteName: string;
    error?: Error;
    onClose: () => void;
    onDelete: () => void;
  }) => (
    <div data-testid="delete-modal">
      <span>{deleteName}</span>
      {error && <span>{error.message}</span>}
      <button type="button" data-testid="delete-confirm" onClick={onDelete}>
        Confirm delete
      </button>
      <button type="button" data-testid="delete-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const mockDeleteConnection = jest.mocked(deleteConnection);

const connection: Connection = {
  metadata: { id: '550e8400-e29b-41d4-a716-446655440001' },
  resource: {
    name: 'warehouse',
    data_connection_type_id: '550e8400-e29b-41d4-a716-446655440003',
    format: 'tabular',
    credentials_ref: { secret: 'warehouse' },
  },
  status: { state: 'ready' },
};

const renderModal = (callbacks?: Partial<React.ComponentProps<typeof ConnectionDeleteModal>>) =>
  render(
    <ConnectionDeleteModal
      connection={connection}
      namespace="test-project"
      onClose={jest.fn()}
      {...callbacks}
    />,
  );

describe('ConnectionDeleteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the connection and reports success', async () => {
    const user = userEvent.setup();
    const deleteRequest = jest.fn(() => Promise.resolve());
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    mockDeleteConnection.mockImplementation(() => deleteRequest);

    renderModal({ onSuccess, onClose });
    await user.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => {
      expect(deleteRequest).toHaveBeenCalledWith(
        {},
        'test-project',
        '550e8400-e29b-41d4-a716-446655440001',
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the error and reports failure', async () => {
    const user = userEvent.setup();
    const deleteRequest = jest.fn(() => Promise.reject(new Error('delete failed')));
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onClose = jest.fn();
    mockDeleteConnection.mockImplementation(() => deleteRequest);

    renderModal({ onSuccess, onError, onClose });
    await user.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => {
      expect(screen.getByText('delete failed')).toBeTruthy();
      expect(onError).toHaveBeenCalledWith(new Error('delete failed'));
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a successful delete that resolves after unmount', async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void = () => undefined;
    const pendingDelete = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const deleteRequest = jest.fn(() => pendingDelete);
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onClose = jest.fn();
    mockDeleteConnection.mockImplementation(() => deleteRequest);

    const { unmount } = renderModal({ onSuccess, onError, onClose });
    await user.click(screen.getByTestId('delete-confirm'));
    unmount();

    await act(async () => {
      resolveDelete();
      await pendingDelete;
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a failed delete that rejects after unmount', async () => {
    const user = userEvent.setup();
    let rejectDelete: (reason?: unknown) => void = () => undefined;
    const pendingDelete = new Promise<void>((_resolve, reject) => {
      rejectDelete = reject;
    });
    const deleteRequest = jest.fn(() => pendingDelete);
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onClose = jest.fn();
    mockDeleteConnection.mockImplementation(() => deleteRequest);

    const { unmount } = renderModal({ onSuccess, onError, onClose });
    await user.click(screen.getByTestId('delete-confirm'));
    unmount();

    await act(async () => {
      rejectDelete(new Error('delete failed'));
      await pendingDelete.catch(() => undefined);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
