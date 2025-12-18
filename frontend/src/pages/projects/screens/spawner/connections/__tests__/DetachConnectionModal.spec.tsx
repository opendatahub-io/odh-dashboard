import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockConnection } from '#~/__mocks__/mockConnection';
import { DetachConnectionModal } from '#~/pages/projects/screens/spawner/connections/DetachConnectionModal';

describe('DetachConnectionModal', () => {
  const mockOnDetach = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnDetach.mockClear();
    mockOnClose.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should dismiss modal when Enter key is pressed', () => {
    const connection = mockConnection({ displayName: 'Test Connection' });

    render(
      <DetachConnectionModal
        connection={connection}
        notebookDisplayName="Test Workbench"
        onDetach={mockOnDetach}
        onClose={mockOnClose}
      />,
    );

    // The FocusableDiv should auto-focus on mount
    // Press Enter key
    const { activeElement } = document;
    expect(activeElement).not.toBeNull();
    fireEvent.keyDown(activeElement as Element, { key: 'Enter' });

    // Advance timers to account for the 200ms delay in ContentModal
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Cancel button has clickOnEnter: true, so onClose should be called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnDetach).not.toHaveBeenCalled();
  });

  it('should show warning message when workbench is running', () => {
    const connection = mockConnection({ displayName: 'Test Connection' });

    render(
      <DetachConnectionModal
        connection={connection}
        isRunning
        notebookDisplayName="Test Workbench"
        onDetach={mockOnDetach}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText(/To avoid losing your work, save any recent data/)).toBeInTheDocument();
  });

  it('should show simple message when workbench is not running', () => {
    const connection = mockConnection({ displayName: 'Test Connection' });

    render(
      <DetachConnectionModal
        connection={connection}
        notebookDisplayName="Test Workbench"
        onDetach={mockOnDetach}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText(/connection will be detached from the/)).toBeInTheDocument();
    expect(screen.queryByText(/To avoid losing your work/)).not.toBeInTheDocument();
  });

  it('should call onDetach when Detach button is clicked', () => {
    const connection = mockConnection({ displayName: 'Test Connection' });

    render(
      <DetachConnectionModal
        connection={connection}
        notebookDisplayName="Test Workbench"
        onDetach={mockOnDetach}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByTestId('detach-connection-modal-button'));

    expect(mockOnDetach).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel button is clicked', () => {
    const connection = mockConnection({ displayName: 'Test Connection' });

    render(
      <DetachConnectionModal
        connection={connection}
        notebookDisplayName="Test Workbench"
        onDetach={mockOnDetach}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByTestId('cancel-connection-modal-button'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render danger variant Detach button when workbench is running', () => {
    const connection = mockConnection({ displayName: 'Test Connection' });

    render(
      <DetachConnectionModal
        connection={connection}
        isRunning
        notebookDisplayName="Test Workbench"
        onDetach={mockOnDetach}
        onClose={mockOnClose}
      />,
    );

    const detachButton = screen.getByTestId('detach-connection-modal-button');
    expect(detachButton).toHaveClass('pf-m-danger');
  });
});
