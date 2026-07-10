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
      screen.getByText('Enable limited support accelerator configuration'),
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

    expect(screen.getByText('Enable limited support runtime')).toBeInTheDocument();
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
        'By enabling this accelerator configuration, you acknowledge that it is not recommended for production workloads and that support coverage differs from standard accelerator configurations.',
      ),
    ).toBeInTheDocument();
  });

  it('should call onAccept when Enable button is clicked', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByTestId('unsupported-status-accept-button'));
    expect(mockOnAccept).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Cancel button is clicked', () => {
    render(
      <UnsupportedStatusAcceptanceModal
        resourceTypeLabel="runtime"
        onAccept={mockOnAccept}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByTestId('unsupported-status-cancel-button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnAccept).not.toHaveBeenCalled();
  });
});
