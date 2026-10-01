import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import StopRunModal from '../StopRunModal';

describe('StopRunModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isTerminating: false,
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

  it('should close and call onCancel on Escape when no stop request is pending', async () => {
    const onCancel = jest.fn();
    render(<StopRunModal {...defaultProps} onCancel={onCancel} />);

    await userEvent.keyboard('{Escape}');

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should not close or call onCancel on Escape while isTerminating is true', async () => {
    const onCancel = jest.fn();
    render(<StopRunModal {...defaultProps} isTerminating onCancel={onCancel} />);

    await userEvent.keyboard('{Escape}');

    // PatternFly's Modal invokes onClose for Escape regardless of the disabled Cancel
    // button — closing here would let a stray "cancel" event race with the submit
    // success/failure event fired once the in-flight stop request resolves.
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should not close or call onCancel on Escape while a stop request is submitting', async () => {
    const onCancel = jest.fn();
    let resolveConfirm: () => void = () => undefined;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    render(<StopRunModal {...defaultProps} onConfirm={onConfirm} onCancel={onCancel} />);

    await userEvent.click(screen.getByTestId('confirm-stop-run-button'));
    await userEvent.keyboard('{Escape}');

    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    resolveConfirm();
  });
});
