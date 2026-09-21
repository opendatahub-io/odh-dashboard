import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import DeleteRunModal from '~/app/components/run-results/DeleteRunModal';
import { AUTOML_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  ...jest.requireActual('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils'),
  fireFormTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);

const renderModal = (props: Partial<React.ComponentProps<typeof DeleteRunModal>> = {}) => {
  const defaultProps: React.ComponentProps<typeof DeleteRunModal> = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isDeleting: false,
    runName: 'my-test-run',
    ...props,
  };
  return render(<DeleteRunModal {...defaultProps} />);
};

describe('DeleteRunModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with title and body text', () => {
    renderModal();

    expect(screen.getByText('Delete AutoML optimization run?')).toBeInTheDocument();
    expect(screen.getByText(/The run will be permanently deleted/)).toBeInTheDocument();
  });

  it('should render Delete and Cancel buttons', () => {
    renderModal();

    expect(screen.getByTestId('confirm-delete-run-button')).toHaveTextContent('Delete');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should disable Delete button until run name is typed', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByTestId('confirm-delete-run-button')).toBeDisabled();

    await user.type(screen.getByTestId('confirm-delete-input'), 'my-test-run');

    expect(screen.getByTestId('confirm-delete-run-button')).toBeEnabled();
  });

  it('should call onConfirm when Delete button is clicked after typing run name', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });

    await user.type(screen.getByTestId('confirm-delete-input'), 'my-test-run');
    await user.click(screen.getByTestId('confirm-delete-run-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm on Enter key after typing run name', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });

    await user.type(screen.getByTestId('confirm-delete-input'), 'my-test-run{Enter}');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should not call onConfirm on Enter key when input does not match', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });

    await user.type(screen.getByTestId('confirm-delete-input'), 'wrong-name{Enter}');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should call onClose when Cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ onClose });

    await user.type(screen.getByTestId('confirm-delete-input'), 'partial');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when isDeleting is true', async () => {
    const user = userEvent.setup();
    renderModal({ isDeleting: true });

    await user.type(screen.getByTestId('confirm-delete-input'), 'my-test-run');

    expect(screen.getByTestId('confirm-delete-run-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('should show loading spinner when isDeleting is true', () => {
    renderModal({ isDeleting: true });

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-valuetext', 'Deleting run');
  });

  it('should not render when isOpen is false', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByTestId('delete-run-modal')).not.toBeInTheDocument();
  });

  it('should not close or fire a cancel event on Escape while a deletion is pending', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ onClose, isDeleting: true });

    await user.keyboard('{Escape}');

    // PatternFly's Modal invokes onClose for Escape regardless of the disabled Cancel
    // button — closing here would let a stray "cancel" event race with the submit
    // success/failure event that handleDelete fires once the in-flight request resolves.
    expect(onClose).not.toHaveBeenCalled();
    expect(fireFormTrackingEventMock).not.toHaveBeenCalled();
  });

  it('should close and fire a cancel event on Escape when no deletion is pending', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ onClose, isDeleting: false });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTOML_EVENTS.RUN_DELETED,
      expect.objectContaining({ outcome: TrackingOutcome.cancel, source: 'runsList' }),
    );
  });
});
