import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnsupportedStatusAcceptanceModal from '../UnsupportedStatusAcceptanceModal';

describe('UnsupportedStatusAcceptanceModal', () => {
  const mockOnAccept = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with the correct title for accelerator configuration', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="accelerator configuration"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText('Enable limited-support accelerator configuration?'),
    ).toBeInTheDocument();
  });

  it('should render with the correct title for runtime', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Enable limited-support runtime?')).toBeInTheDocument();
  });

  it('should render body text with the resource type label', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="accelerator configuration"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText(
        /The support coverage for this accelerator configuration is limited to 1 month after release\./,
      ),
    ).toBeInTheDocument();
  });

  it('should render the I understand checkbox', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByTestId('unsupported-status-acceptance-checkbox')).toBeInTheDocument();
    expect(screen.getByText('I understand')).toBeInTheDocument();
  });

  it('should have the Enable button disabled until the checkbox is checked', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    const enableButton = screen.getByTestId('unsupported-status-accept-button');
    expect(enableButton).toBeDisabled();

    fireEvent.click(screen.getByTestId('unsupported-status-acceptance-checkbox'));
    expect(enableButton).toBeEnabled();
  });

  it('should call onAccept when Enable button is clicked after checking the checkbox', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByTestId('unsupported-status-acceptance-checkbox'));
    fireEvent.click(screen.getByTestId('unsupported-status-accept-button'));
    expect(mockOnAccept).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose with cancel when Cancel button is clicked', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByTestId('unsupported-status-cancel-button'));
    expect(mockOnClose).toHaveBeenCalledWith('cancel');
    expect(mockOnAccept).not.toHaveBeenCalled();
  });

  it('should call onClose with close when modal close control is used', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalledWith('close');
    expect(mockOnAccept).not.toHaveBeenCalled();
  });
});
