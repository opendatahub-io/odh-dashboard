import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import DeleteRunModal from '~/app/components/run-results/DeleteRunModal';
import { AUTORAG_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

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
    source: 'runsList',
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

    expect(screen.getByText('Delete AutoRAG optimization run?')).toBeInTheDocument();
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

  it('should call onClose and fire a cancel event when Cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ onClose });

    await user.type(screen.getByTestId('confirm-delete-input'), 'partial');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_DELETED, {
      outcome: TrackingOutcome.cancel,
      source: 'runsList',
    });
  });

  it('should report the source it was opened from in the cancel event', async () => {
    const user = userEvent.setup();
    renderModal({ source: 'resultsPage' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.EXPERIMENT_DELETED,
      expect.objectContaining({ source: 'resultsPage' }),
    );
  });

  it('should close and fire a cancel event on Escape when no delete request is pending', async () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.EXPERIMENT_DELETED,
      expect.objectContaining({ outcome: TrackingOutcome.cancel, source: 'runsList' }),
    );
  });

  it('should not close or fire a cancel event on Escape while isDeleting is true', async () => {
    const onClose = jest.fn();
    renderModal({ onClose, isDeleting: true });

    await userEvent.keyboard('{Escape}');

    // PatternFly's Modal invokes onClose for Escape regardless of the disabled Cancel
    // button — closing here would let a stray "cancel" event race with the submit
    // success/failure event fired once the in-flight delete request resolves.
    expect(onClose).not.toHaveBeenCalled();
    expect(fireFormTrackingEventMock).not.toHaveBeenCalled();
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

  it('should not close or fire a cancel event if Escape is pressed synchronously right after clicking Delete, before the isDeleting prop updates', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    // isDeleting stays false throughout this test — it's externally controlled by the
    // parent and won't auto-update just because the click handler ran. The fix relies on
    // local `isSubmitting` state to close the gap instead.
    renderModal({ onClose, onConfirm, isDeleting: false });

    await user.type(screen.getByTestId('confirm-delete-input'), 'my-test-run');

    // Click Delete and immediately fire Escape in the same synchronous step — no await in
    // between — to reproduce the real race: by the time the very next line runs, the local
    // `isSubmitting` state (set synchronously inside the click handler) must already be
    // `true`, well before any microtask-scheduled `isDeleting` prop update could occur.
    fireEvent.click(screen.getByTestId('confirm-delete-run-button'));
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(fireFormTrackingEventMock).not.toHaveBeenCalledWith(
      AUTORAG_EVENTS.EXPERIMENT_DELETED,
      expect.objectContaining({ outcome: TrackingOutcome.cancel }),
    );
  });

  it('should re-enable Cancel after a failed deletion (isDeleting cycles true -> false)', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    const { rerender } = renderModal({ onClose, onConfirm, isDeleting: false });

    await user.type(screen.getByTestId('confirm-delete-input'), 'my-test-run');
    await user.click(screen.getByTestId('confirm-delete-run-button'));

    // The mutation starts: parent re-renders with isDeleting: true.
    rerender(
      <DeleteRunModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        isDeleting
        runName="my-test-run"
        source="runsList"
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    // The mutation fails and settles: parent re-renders with isDeleting back to false, but
    // the modal stays open so the user can retry or cancel.
    rerender(
      <DeleteRunModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        isDeleting={false}
        runName="my-test-run"
        source="runsList"
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
