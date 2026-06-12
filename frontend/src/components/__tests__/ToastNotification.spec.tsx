import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AlertVariant } from '@patternfly/react-core';
import ToastNotification from '#~/components/ToastNotification';
import {
  DashboardNotification,
  DashboardNotificationActionTypes,
} from '#~/concepts/notifications/types';

const mockDispatch = jest.fn();

jest.mock('#~/concepts/notifications/DashboardNotificationContext', () => ({
  useDashboardNotificationContext: () => ({
    notifications: [],
    dispatch: mockDispatch,
    getNextId: () => 0,
  }),
}));

const TOAST_TIMEOUT = 8000;

const createNotification = (
  overrides: Partial<DashboardNotification> = {},
): DashboardNotification => ({
  id: 1,
  status: AlertVariant.success,
  title: 'Success notification',
  message: 'Operation completed',
  hidden: false,
  read: false,
  timestamp: new Date('2025-06-01'),
  ...overrides,
});

describe('ToastNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render the notification with title and message', () => {
    render(<ToastNotification notification={createNotification()} />);
    expect(screen.getByText('Success notification')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('should render with correct alert variant', () => {
    render(
      <ToastNotification notification={createNotification({ status: AlertVariant.danger })} />,
    );
    const alert = screen.getByTestId('toast-notification-alert');
    expect(alert).toBeInTheDocument();
  });

  it('should dispatch HIDE after timeout when not hovered', () => {
    render(<ToastNotification notification={createNotification({ id: 3 })} />);

    expect(mockDispatch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(TOAST_TIMEOUT);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: DashboardNotificationActionTypes.HIDE,
      payload: { id: 3 },
    });
  });

  it('should not dispatch HIDE when mouse is over the notification', () => {
    render(<ToastNotification notification={createNotification({ id: 4 })} />);

    const alert = screen.getByTestId('toast-notification-alert');
    fireEvent.mouseEnter(alert);

    act(() => {
      jest.advanceTimersByTime(TOAST_TIMEOUT);
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: DashboardNotificationActionTypes.HIDE }),
    );
  });

  it('should dispatch HIDE after mouse leaves and timeout has passed', () => {
    render(<ToastNotification notification={createNotification({ id: 5 })} />);

    const alert = screen.getByTestId('toast-notification-alert');

    fireEvent.mouseEnter(alert);

    act(() => {
      jest.advanceTimersByTime(TOAST_TIMEOUT);
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: DashboardNotificationActionTypes.HIDE }),
    );

    fireEvent.mouseLeave(alert);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: DashboardNotificationActionTypes.HIDE,
      payload: { id: 5 },
    });
  });

  it('should dispatch ACK when close button is clicked', () => {
    render(<ToastNotification notification={createNotification({ id: 6 })} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: DashboardNotificationActionTypes.ACK,
      payload: { id: 6 },
    });
  });

  it('should return null when notification is hidden', () => {
    const { container } = render(
      <ToastNotification notification={createNotification({ hidden: true })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should not dispatch HIDE when notification has no id', () => {
    render(<ToastNotification notification={createNotification({ id: undefined })} />);

    act(() => {
      jest.advanceTimersByTime(TOAST_TIMEOUT);
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: DashboardNotificationActionTypes.HIDE }),
    );
  });

  it('should not render close button when notification has no id', () => {
    render(<ToastNotification notification={createNotification({ id: undefined })} />);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('should render action links when notification has actions', () => {
    const notification = createNotification({
      actions: [
        { title: 'Retry', onClick: jest.fn() },
        { title: 'Cancel', onClick: jest.fn() },
      ],
    });

    render(<ToastNotification notification={notification} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call action onClick when action link is clicked', () => {
    const onRetry = jest.fn();
    const notification = createNotification({
      actions: [{ title: 'Retry', onClick: onRetry }],
    });

    render(<ToastNotification notification={notification} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
