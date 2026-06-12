import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertVariant } from '@patternfly/react-core';
import AppNotificationDrawer from '#~/app/AppNotificationDrawer';
import * as DashboardNotificationModule from '#~/concepts/notifications/DashboardNotificationContext';
import {
  DashboardNotification,
  DashboardNotificationActionTypes,
} from '#~/concepts/notifications/types';

jest.mock('#~/concepts/notifications/DashboardNotificationContext', () => ({
  useDashboardNotificationContext: jest.fn(),
  useUnreadNotificationCount: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockUseDashboardNotificationContext = jest.mocked(
  DashboardNotificationModule.useDashboardNotificationContext,
);
const mockUseUnreadNotificationCount = jest.mocked(
  DashboardNotificationModule.useUnreadNotificationCount,
);

const createNotification = (
  overrides: Partial<DashboardNotification> = {},
): DashboardNotification => ({
  id: 1,
  status: AlertVariant.success,
  title: 'Test notification',
  message: 'Test message',
  hidden: false,
  read: false,
  timestamp: new Date('2025-06-01T12:00:00Z'),
  ...overrides,
});

describe('AppNotificationDrawer', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseUnreadNotificationCount.mockReturnValue(0);
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render empty state when there are no notifications', () => {
    render(<AppNotificationDrawer onClose={onClose} />);
    expect(screen.getByText('There are no notifications at this time.')).toBeInTheDocument();
  });

  it('should render notifications sorted by timestamp (newest first)', () => {
    const notifications = [
      createNotification({
        id: 1,
        title: 'Older',
        timestamp: new Date('2025-06-01T10:00:00Z'),
      }),
      createNotification({
        id: 2,
        title: 'Newer',
        timestamp: new Date('2025-06-01T12:00:00Z'),
      }),
    ];

    mockUseDashboardNotificationContext.mockReturnValue({
      notifications,
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles[0]).toBe('Newer');
    expect(titles[1]).toBe('Older');
  });

  it('should dispatch ACK when clicking on a notification', () => {
    const notification = createNotification({ id: 5 });
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [notification],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);

    const listItem = screen.getByText('Test notification').closest('li');
    if (listItem) {
      fireEvent.click(listItem);
    }

    expect(mockDispatch).toHaveBeenCalledWith({
      type: DashboardNotificationActionTypes.ACK,
      payload: { id: 5 },
    });
  });

  it('should dispatch REMOVE when clicking the remove button', () => {
    const notification = createNotification({ id: 7 });
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [notification],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);

    const removeBtn = screen.getByRole('button', { name: 'remove notification' });
    fireEvent.click(removeBtn);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: DashboardNotificationActionTypes.REMOVE,
      payload: { id: 7 },
    });
  });

  it('should not dispatch ACK when notification has no id', () => {
    const notification = createNotification({ id: undefined });
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [notification],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);

    const listItem = screen.getByText('Test notification').closest('li');
    if (listItem) {
      fireEvent.click(listItem);
    }

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch REMOVE when notification has no id', () => {
    const notification = createNotification({ id: undefined });
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [notification],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);

    const removeBtn = screen.getByRole('button', { name: 'remove notification' });
    fireEvent.click(removeBtn);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should display notification message', () => {
    const notification = createNotification({ message: 'Important message content' });
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [notification],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);
    expect(screen.getByText('Important message content')).toBeInTheDocument();
  });

  it('should render action buttons when notification has actions', () => {
    const notification = createNotification({
      actions: [
        { title: 'View details', onClick: jest.fn() },
        { title: 'Dismiss', onClick: jest.fn() },
      ],
    });
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [notification],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);
    expect(screen.getByText('View details')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should call onClose when the close button in the header is clicked', () => {
    mockUseDashboardNotificationContext.mockReturnValue({
      notifications: [createNotification()],
      dispatch: mockDispatch,
      getNextId: () => 0,
    });

    render(<AppNotificationDrawer onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
