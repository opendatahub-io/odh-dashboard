import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AUTOML_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  ...jest.requireActual('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils'),
  fireFormTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);

describe('StopRunModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isTerminating: false,
    source: 'runsList' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with title and body text', () => {
    render(<StopRunModal {...defaultProps} />);

    expect(screen.getByText('Stop pipeline run?')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to stop this run/)).toBeInTheDocument();
  });

  it('should render Stop and Cancel buttons', () => {
    render(<StopRunModal {...defaultProps} />);

    expect(screen.getByTestId('confirm-stop-run-button')).toHaveTextContent('Stop');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call onConfirm when Stop button is clicked', async () => {
    render(<StopRunModal {...defaultProps} />);

    await userEvent.click(screen.getByTestId('confirm-stop-run-button'));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel button is clicked', async () => {
    render(<StopRunModal {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when isTerminating is true', () => {
    render(<StopRunModal {...defaultProps} isTerminating />);

    expect(screen.getByTestId('confirm-stop-run-button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('should show loading spinner when isTerminating is true', () => {
    render(<StopRunModal {...defaultProps} isTerminating />);

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-valuetext', 'Stopping run');
  });

  it('should not render when isOpen is false', () => {
    render(<StopRunModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('stop-run-modal')).not.toBeInTheDocument();
  });

  it('should display run name in body text when runName is provided', () => {
    render(<StopRunModal {...defaultProps} runName="My Test Run" />);

    expect(screen.getByText(/Are you sure you want to stop "My Test Run"\?/)).toBeInTheDocument();
  });

  it('should display generic text when runName is not provided', () => {
    render(<StopRunModal {...defaultProps} />);

    expect(screen.getByText(/Are you sure you want to stop this run\?/)).toBeInTheDocument();
  });

  it('should indicate the run will be marked as failed', () => {
    render(<StopRunModal {...defaultProps} />);

    expect(screen.getByText(/the run will be marked as failed/)).toBeInTheDocument();
  });

  it('should close and fire a cancel event on Escape when no stop request is pending', async () => {
    render(<StopRunModal {...defaultProps} />);

    await userEvent.keyboard('{Escape}');

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTOML_EVENTS.RUN_STOPPED,
      expect.objectContaining({ outcome: TrackingOutcome.cancel, source: 'runsList' }),
    );
  });

  it('should not close or fire a cancel event on Escape while isTerminating is true', async () => {
    render(<StopRunModal {...defaultProps} isTerminating />);

    await userEvent.keyboard('{Escape}');

    // PatternFly's Modal invokes onClose for Escape regardless of the disabled Cancel
    // button — closing here would let a stray "cancel" event race with the submit
    // success/failure event fired once the in-flight stop request resolves.
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(fireFormTrackingEventMock).not.toHaveBeenCalled();
  });

  it('should not close or fire a cancel event on Escape while a stop request is submitting', async () => {
    let resolveConfirm: () => void = () => undefined;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    render(<StopRunModal {...defaultProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByTestId('confirm-stop-run-button'));
    await userEvent.keyboard('{Escape}');

    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(fireFormTrackingEventMock).not.toHaveBeenCalled();

    resolveConfirm();
  });
});
