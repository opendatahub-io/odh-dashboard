import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertVariant } from '@patternfly/react-core';
import ToastNotification from '~/app/components/ToastNotification';
import { AppNotification, useStore } from '~/app/store';

jest.useFakeTimers();

// Mock the store
jest.mock('~/app/store', () => ({
  ...jest.requireActual('~/app/store'),
  useStore: jest.fn(),
}));

const mockUseStore = jest.mocked(useStore);

describe('ToastNotification', () => {
  const mockRemoveNotification = jest.fn();

  const mockNotification: AppNotification = {
    id: 'test-notification-1',
    status: AlertVariant.success,
    title: 'Test Title',
    message: 'Test message content',
    timestamp: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue({
      removeNotification: mockRemoveNotification,
      notifications: [],
      addNotification: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should render notification with title and message', () => {
    render(<ToastNotification notification={mockNotification} />);

    expect(screen.getByTestId('toast-notification-alert')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('should render notification with correct variant', () => {
    const { rerender } = render(<ToastNotification notification={mockNotification} />);
    expect(screen.getByTestId('toast-notification-alert')).toHaveClass('pf-m-success');

    rerender(
      <ToastNotification notification={{ ...mockNotification, status: AlertVariant.danger }} />,
    );
    expect(screen.getByTestId('toast-notification-alert')).toHaveClass('pf-m-danger');

    rerender(
      <ToastNotification notification={{ ...mockNotification, status: AlertVariant.warning }} />,
    );
    expect(screen.getByTestId('toast-notification-alert')).toHaveClass('pf-m-warning');

    rerender(
      <ToastNotification notification={{ ...mockNotification, status: AlertVariant.info }} />,
    );
    expect(screen.getByTestId('toast-notification-alert')).toHaveClass('pf-m-info');
  });

  it('should render close button', () => {
    render(<ToastNotification notification={mockNotification} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('should call removeNotification when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    render(<ToastNotification notification={mockNotification} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockRemoveNotification).toHaveBeenCalledWith('test-notification-1');
  });

  it('should auto-dismiss after timeout', () => {
    render(<ToastNotification notification={mockNotification} />);

    expect(mockRemoveNotification).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(8000);
    });

    expect(mockRemoveNotification).toHaveBeenCalledWith('test-notification-1');
  });

  it('should not auto-dismiss before timeout', () => {
    render(<ToastNotification notification={mockNotification} />);

    act(() => {
      jest.advanceTimersByTime(7999);
    });

    expect(mockRemoveNotification).not.toHaveBeenCalled();
  });

  it('should pause auto-dismiss on mouse enter', async () => {
    const user = userEvent.setup({ delay: null });

    render(<ToastNotification notification={mockNotification} />);

    const alert = screen.getByTestId('toast-notification-alert');

    // Advance time but not enough to trigger dismiss
    act(() => {
      jest.advanceTimersByTime(7000);
    });

    // Mouse enters - should pause dismiss
    await user.hover(alert);

    // Advance past the timeout
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should not be removed because mouse is over it
    expect(mockRemoveNotification).not.toHaveBeenCalled();
  });

  it('should resume auto-dismiss on mouse leave after timeout', async () => {
    const user = userEvent.setup({ delay: null });

    render(<ToastNotification notification={mockNotification} />);

    const alert = screen.getByTestId('toast-notification-alert');

    // Advance to just before timeout
    act(() => {
      jest.advanceTimersByTime(7999);
    });

    // Mouse enters
    await user.hover(alert);

    // Advance past timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should not dismiss yet
    expect(mockRemoveNotification).not.toHaveBeenCalled();

    // Mouse leaves - wait for effect to run
    await act(async () => {
      await user.unhover(alert);
    });

    // Should dismiss after unhover effect runs
    await waitFor(() => {
      expect(mockRemoveNotification).toHaveBeenCalledWith('test-notification-1');
    });
  });

  it('should pause auto-dismiss on focus', async () => {
    render(<ToastNotification notification={mockNotification} />);

    const alert = screen.getByTestId('toast-notification-alert');

    // Advance time
    act(() => {
      jest.advanceTimersByTime(7000);
    });

    // Fire focus event
    fireEvent.focus(alert);

    // Advance past timeout
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should not be removed because it has focus
    expect(mockRemoveNotification).not.toHaveBeenCalled();
  });

  it('should resume auto-dismiss on blur after timeout', async () => {
    render(<ToastNotification notification={mockNotification} />);

    const alert = screen.getByTestId('toast-notification-alert');

    // Fire focus event before timeout
    fireEvent.focus(alert);

    // Advance to timeout
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    // Should not dismiss while focused
    expect(mockRemoveNotification).not.toHaveBeenCalled();

    // Fire blur event
    fireEvent.blur(alert);

    // Should dismiss after blur effect runs
    await waitFor(() => {
      expect(mockRemoveNotification).toHaveBeenCalledWith('test-notification-1');
    });
  });

  it('should render action links when provided', () => {
    const mockAction1 = jest.fn();
    const mockAction2 = jest.fn();

    const notificationWithActions: AppNotification = {
      ...mockNotification,
      actions: [
        { title: 'Action 1', onClick: mockAction1 },
        { title: 'Action 2', onClick: mockAction2 },
      ],
    };

    render(<ToastNotification notification={notificationWithActions} />);

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('should call action onClick when action link is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockAction = jest.fn();

    const notificationWithAction: AppNotification = {
      ...mockNotification,
      actions: [{ title: 'Click Me', onClick: mockAction }],
    };

    render(<ToastNotification notification={notificationWithAction} />);

    const actionLink = screen.getByText('Click Me');
    await user.click(actionLink);

    expect(mockAction).toHaveBeenCalled();
  });

  it('should not render action links when actions are not provided', () => {
    render(<ToastNotification notification={mockNotification} />);

    // Alert should exist but no action links
    expect(screen.getByTestId('toast-notification-alert')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should handle multiple action links correctly', async () => {
    const user = userEvent.setup({ delay: null });
    const mockAction1 = jest.fn();
    const mockAction2 = jest.fn();
    const mockAction3 = jest.fn();

    const notificationWithActions: AppNotification = {
      ...mockNotification,
      actions: [
        { title: 'First', onClick: mockAction1 },
        { title: 'Second', onClick: mockAction2 },
        { title: 'Third', onClick: mockAction3 },
      ],
    };

    render(<ToastNotification notification={notificationWithActions} />);

    await user.click(screen.getByText('First'));
    expect(mockAction1).toHaveBeenCalledTimes(1);
    expect(mockAction2).not.toHaveBeenCalled();
    expect(mockAction3).not.toHaveBeenCalled();

    await user.click(screen.getByText('Second'));
    expect(mockAction1).toHaveBeenCalledTimes(1);
    expect(mockAction2).toHaveBeenCalledTimes(1);
    expect(mockAction3).not.toHaveBeenCalled();

    await user.click(screen.getByText('Third'));
    expect(mockAction1).toHaveBeenCalledTimes(1);
    expect(mockAction2).toHaveBeenCalledTimes(1);
    expect(mockAction3).toHaveBeenCalledTimes(1);
  });

  it('should handle focus state correctly', async () => {
    render(<ToastNotification notification={mockNotification} />);

    const alert = screen.getByTestId('toast-notification-alert');

    // Fire focus event
    fireEvent.focus(alert);

    // Advance to timeout
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    // Should not dismiss while focused
    expect(mockRemoveNotification).not.toHaveBeenCalled();
  });

  it('should handle mouse hover state correctly', async () => {
    const user = userEvent.setup({ delay: null });

    render(<ToastNotification notification={mockNotification} />);

    const alert = screen.getByTestId('toast-notification-alert');

    // Mouse over before timeout
    await user.hover(alert);

    // Advance to timeout
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    // Should not dismiss while mouse is over
    expect(mockRemoveNotification).not.toHaveBeenCalled();
  });
});
