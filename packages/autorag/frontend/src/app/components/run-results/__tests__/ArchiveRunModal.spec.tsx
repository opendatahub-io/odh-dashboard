import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ArchiveRunModal from '~/app/components/run-results/ArchiveRunModal';
import { pipelinesArchivedRunsPathname } from '~/app/utilities/routes';

const renderModal = (props: Partial<React.ComponentProps<typeof ArchiveRunModal>> = {}) => {
  const defaultProps: React.ComponentProps<typeof ArchiveRunModal> = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isArchiving: false,
    runName: 'my-test-run',
    namespace: 'test-namespace',
    ...props,
  };
  return render(
    <MemoryRouter>
      <ArchiveRunModal {...defaultProps} />
    </MemoryRouter>,
  );
};

describe('ArchiveRunModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with title and body text', () => {
    renderModal();

    expect(screen.getByText('Archive AutoRAG optimization run?')).toBeInTheDocument();
    expect(screen.getByText(/The run will be archived/)).toBeInTheDocument();
    expect(screen.getByText('archived runs')).toBeInTheDocument();
  });

  it('should render Archive and Cancel buttons', () => {
    renderModal();

    expect(screen.getByTestId('confirm-archive-run-button')).toHaveTextContent('Archive');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should disable Archive button until run name is typed', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByTestId('confirm-archive-run-button')).toBeDisabled();

    await user.type(screen.getByTestId('confirm-archive-input'), 'my-test-run');

    expect(screen.getByTestId('confirm-archive-run-button')).toBeEnabled();
  });

  it('should call onConfirm when Archive button is clicked after typing run name', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });

    await user.type(screen.getByTestId('confirm-archive-input'), 'my-test-run');
    await user.click(screen.getByTestId('confirm-archive-run-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm on Enter key after typing run name', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });

    await user.type(screen.getByTestId('confirm-archive-input'), 'my-test-run{Enter}');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should not call onConfirm on Enter key when input does not match', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });

    await user.type(screen.getByTestId('confirm-archive-input'), 'wrong-name{Enter}');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should call onClose when Cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ onClose });

    await user.type(screen.getByTestId('confirm-archive-input'), 'partial');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when isArchiving is true', async () => {
    const user = userEvent.setup();
    renderModal({ isArchiving: true });

    await user.type(screen.getByTestId('confirm-archive-input'), 'my-test-run');

    expect(screen.getByTestId('confirm-archive-run-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('should show loading spinner when isArchiving is true', () => {
    renderModal({ isArchiving: true });

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-valuetext', 'Archiving run');
  });

  it('should not render when isOpen is false', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByTestId('archive-run-modal')).not.toBeInTheDocument();
  });

  it('should render archived runs as a link to the correct route', () => {
    renderModal({ namespace: 'my-namespace' });

    const link = screen.getByText('archived runs');
    expect(link).toHaveAttribute('href', pipelinesArchivedRunsPathname('my-namespace'));
  });
});
