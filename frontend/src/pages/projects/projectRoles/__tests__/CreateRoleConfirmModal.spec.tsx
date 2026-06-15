import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateRoleConfirmModal from '#~/pages/projects/projectRoles/CreateRoleConfirmModal';

describe('CreateRoleConfirmModal', () => {
  it('should render with warning title and body text', () => {
    render(<CreateRoleConfirmModal onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Create empty role?')).toBeInTheDocument();
    expect(screen.getByText(/has no rules and won't grant any permissions/)).toBeInTheDocument();
  });

  it('should call onConfirm when Create is clicked', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<CreateRoleConfirmModal onConfirm={onConfirm} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('confirm-create-button'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<CreateRoleConfirmModal onConfirm={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('confirm-cancel-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show error alert when onConfirm rejects', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('API failure'));
    render(<CreateRoleConfirmModal onConfirm={onConfirm} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('confirm-create-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message-alert')).toBeInTheDocument();
      expect(screen.getByText('API failure')).toBeInTheDocument();
    });
  });

  it('should show fallback error when onConfirm rejects with non-Error', async () => {
    const onConfirm = jest.fn().mockRejectedValue('string error');
    render(<CreateRoleConfirmModal onConfirm={onConfirm} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('confirm-create-button'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create role')).toBeInTheDocument();
    });
  });

  it('should disable buttons while submitting', async () => {
    let resolvePromise: () => void = () => undefined;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        }),
    );
    render(<CreateRoleConfirmModal onConfirm={onConfirm} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('confirm-create-button'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-create-button')).toBeDisabled();
      expect(screen.getByTestId('confirm-cancel-button')).toBeDisabled();
    });

    resolvePromise();

    await waitFor(() => {
      expect(screen.getByTestId('confirm-create-button')).not.toBeDisabled();
      expect(screen.getByTestId('confirm-cancel-button')).not.toBeDisabled();
    });
  });
});
