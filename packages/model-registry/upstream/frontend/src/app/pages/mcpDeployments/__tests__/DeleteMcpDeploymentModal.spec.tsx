import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteMcpDeployment } from '~/app/api/mcpDeploymentService';
import { createMockDeployment } from './mcpDeploymentTestUtils';
import DeleteMcpDeploymentModal from '../DeleteMcpDeploymentModal';

jest.mock('~/app/api/mcpDeploymentService', () => ({
  deleteMcpDeployment: jest.fn(),
}));

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useQueryParamNamespaces: jest.fn(() => ({})),
}));

const deleteMcpDeploymentMock = jest.mocked(deleteMcpDeployment);

const renderModal = (onClose = jest.fn()) => {
  const deployment = createMockDeployment({ name: 'kubernetes-mcp' });
  render(<DeleteMcpDeploymentModal deployment={deployment} onClose={onClose} />);
  return { deployment, onClose };
};

describe('DeleteMcpDeploymentModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal with the correct title', () => {
    renderModal();
    expect(screen.getByText('Delete MCP server deployment?')).toBeInTheDocument();
  });

  it('should display the deployment name and warning copy in the modal body', () => {
    renderModal();
    const modal = screen.getByTestId('delete-mcp-deployment-modal');
    expect(modal.textContent).toContain('kubernetes-mcp');
    expect(modal.textContent).toContain('MCP server deployment and its API keys will be deleted');
  });

  it('should render the confirmation label referencing the deployment name', () => {
    renderModal();
    const modal = screen.getByTestId('delete-mcp-deployment-modal');
    expect(modal.textContent).toContain('to confirm deletion');
    expect(screen.getAllByText('kubernetes-mcp').length).toBeGreaterThanOrEqual(1);
  });

  it('should not use a placeholder on the confirmation input', () => {
    renderModal();
    expect(screen.getByTestId('delete-modal-input')).not.toHaveAttribute('placeholder');
  });

  it('should have the delete button disabled initially', () => {
    renderModal();
    expect(screen.getByTestId('delete-modal-confirm-button')).toBeDisabled();
  });

  it('should keep the delete button disabled when incorrect name is typed', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByTestId('delete-modal-input'), 'wrong-name');
    expect(screen.getByTestId('delete-modal-confirm-button')).toBeDisabled();
  });

  it('should enable the delete button when the exact name is typed', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByTestId('delete-modal-input'), 'kubernetes-mcp');
    expect(screen.getByTestId('delete-modal-confirm-button')).not.toBeDisabled();
  });

  it('should call onClose(false) when cancel is clicked', () => {
    const onClose = jest.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('should call onClose(true) after successful deletion', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    deleteMcpDeploymentMock.mockReturnValue(() => Promise.resolve());
    renderModal(onClose);

    await user.type(screen.getByTestId('delete-modal-input'), 'kubernetes-mcp');
    fireEvent.click(screen.getByTestId('delete-modal-confirm-button'));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
  });

  it('should submit on Enter key when exact name is typed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    deleteMcpDeploymentMock.mockReturnValue(() => Promise.resolve());
    renderModal(onClose);

    await user.type(screen.getByTestId('delete-modal-input'), 'kubernetes-mcp{Enter}');

    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
  });

  it('should show the delete button in a disabled state while deletion is in progress', async () => {
    const user = userEvent.setup();
    let resolveDelete!: () => void;
    deleteMcpDeploymentMock.mockReturnValue(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    renderModal();

    await user.type(screen.getByTestId('delete-modal-input'), 'kubernetes-mcp');
    fireEvent.click(screen.getByTestId('delete-modal-confirm-button'));

    expect(screen.getByTestId('delete-modal-confirm-button')).toBeDisabled();

    resolveDelete();
  });

  it('should surface deletion failure via inline alert', async () => {
    const user = userEvent.setup();
    deleteMcpDeploymentMock.mockReturnValue(() =>
      Promise.reject(new Error('Internal server error')),
    );
    renderModal();

    await user.type(screen.getByTestId('delete-modal-input'), 'kubernetes-mcp');
    fireEvent.click(screen.getByTestId('delete-modal-confirm-button'));

    await waitFor(() =>
      expect(screen.getByTestId('delete-modal-error-message-alert')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('delete-modal-error-message-alert').textContent).toContain(
      'Internal server error',
    );
  });

  it('should not call onClose when deletion fails', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    deleteMcpDeploymentMock.mockReturnValue(() => Promise.reject(new Error('Failed')));
    renderModal(onClose);

    await user.type(screen.getByTestId('delete-modal-input'), 'kubernetes-mcp');
    fireEvent.click(screen.getByTestId('delete-modal-confirm-button'));

    await waitFor(() =>
      expect(screen.getByTestId('delete-modal-error-message-alert')).toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
