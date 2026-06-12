import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { AlertVariant } from '@patternfly/react-core';
import { DashboardNotificationActionTypes } from '#~/concepts/notifications/types';

// Must use var for hoisting compatibility with jest.mock
// eslint-disable-next-line no-var
var mockModArchDispatch: jest.Mock;

jest.mock('mod-arch-core', () => {
  const react = require('react');
  mockModArchDispatch = jest.fn();
  return {
    NotificationContext: react.createContext({
      notifications: [],
      notificationCount: 0,
      updateNotificationCount: jest.fn(),
      dispatch: mockModArchDispatch,
    }),
    NotificationActionTypes: {
      ADD_NOTIFICATION: 'add_notification',
      DELETE_NOTIFICATION: 'delete_notification',
    },
  };
});

// Import after mock setup
const {
  DashboardNotificationContextProvider,
  useDashboardNotificationContext,
  useUnreadNotificationCount,
  useAddNotification,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('../DashboardNotificationContext');

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <DashboardNotificationContextProvider>{children}</DashboardNotificationContextProvider>
);

describe('DashboardNotificationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dashboardNotificationReducer', () => {
    it('should start with empty notifications', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });
      expect(renderResult.result.current.notifications).toEqual([]);
    });

    it('should add a notification via ADD action', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ADD,
          payload: {
            id: 1,
            status: AlertVariant.success,
            title: 'Test notification',
            message: 'Test message',
            timestamp: new Date('2025-01-01'),
          },
        });
      });

      expect(renderResult.result.current.notifications).toHaveLength(1);
      expect(renderResult.result.current.notifications[0]).toEqual(
        expect.objectContaining({
          id: 1,
          status: AlertVariant.success,
          title: 'Test notification',
          message: 'Test message',
        }),
      );
    });

    it('should hide a notification via HIDE action', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ADD,
          payload: {
            id: 1,
            status: AlertVariant.info,
            title: 'To be hidden',
            timestamp: new Date(),
          },
        });
      });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.HIDE,
          payload: { id: 1 },
        });
      });

      expect(renderResult.result.current.notifications[0].hidden).toBe(true);
    });

    it('should return state unchanged when HIDE targets a non-existent id', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ADD,
          payload: {
            id: 1,
            status: AlertVariant.info,
            title: 'Existing',
            timestamp: new Date(),
          },
        });
      });

      const notificationsBefore = renderResult.result.current.notifications;

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.HIDE,
          payload: { id: 999 },
        });
      });

      expect(renderResult.result.current.notifications).toBe(notificationsBefore);
    });

    it('should acknowledge a notification via ACK action', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ADD,
          payload: {
            id: 1,
            status: AlertVariant.warning,
            title: 'To be acknowledged',
            timestamp: new Date(),
          },
        });
      });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ACK,
          payload: { id: 1 },
        });
      });

      expect(renderResult.result.current.notifications[0].read).toBe(true);
      expect(renderResult.result.current.notifications[0].hidden).toBe(true);
    });

    it('should return state unchanged when ACK targets a non-existent id', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ADD,
          payload: {
            id: 1,
            status: AlertVariant.info,
            title: 'Existing',
            timestamp: new Date(),
          },
        });
      });

      const notificationsBefore = renderResult.result.current.notifications;

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ACK,
          payload: { id: 999 },
        });
      });

      expect(renderResult.result.current.notifications).toBe(notificationsBefore);
    });

    it('should remove a notification via REMOVE action', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.ADD,
          payload: {
            id: 1,
            status: AlertVariant.danger,
            title: 'To be removed',
            timestamp: new Date(),
          },
        });
      });

      expect(renderResult.result.current.notifications).toHaveLength(1);

      act(() => {
        renderResult.result.current.dispatch({
          type: DashboardNotificationActionTypes.REMOVE,
          payload: { id: 1 },
        });
      });

      expect(renderResult.result.current.notifications).toHaveLength(0);
    });
  });

  describe('useUnreadNotificationCount', () => {
    it('should return 0 when there are no notifications', () => {
      const renderResult = renderHook(() => useUnreadNotificationCount(), { wrapper });
      expect(renderResult.result.current).toBe(0);
    });

    it('should count unread notifications', () => {
      const TestComponent: React.FC = () => {
        const { dispatch } = useDashboardNotificationContext();
        const unreadCount = useUnreadNotificationCount();

        React.useEffect(() => {
          dispatch({
            type: DashboardNotificationActionTypes.ADD,
            payload: {
              id: 1,
              status: AlertVariant.success,
              title: 'Unread 1',
              timestamp: new Date(),
            },
          });
          dispatch({
            type: DashboardNotificationActionTypes.ADD,
            payload: {
              id: 2,
              status: AlertVariant.info,
              title: 'Unread 2',
              timestamp: new Date(),
            },
          });
        }, [dispatch]);

        return <div data-testid="unread-count">{unreadCount}</div>;
      };

      render(
        <DashboardNotificationContextProvider>
          <TestComponent />
        </DashboardNotificationContextProvider>,
      );

      expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
    });

    it('should not count read notifications', () => {
      const TestComponent: React.FC = () => {
        const { dispatch } = useDashboardNotificationContext();
        const unreadCount = useUnreadNotificationCount();

        React.useEffect(() => {
          dispatch({
            type: DashboardNotificationActionTypes.ADD,
            payload: {
              id: 1,
              status: AlertVariant.success,
              title: 'Unread',
              timestamp: new Date(),
            },
          });
          dispatch({
            type: DashboardNotificationActionTypes.ADD,
            payload: {
              id: 2,
              status: AlertVariant.info,
              title: 'Read',
              read: true,
              timestamp: new Date(),
            },
          });
        }, [dispatch]);

        return <div data-testid="unread-count">{unreadCount}</div>;
      };

      render(
        <DashboardNotificationContextProvider>
          <TestComponent />
        </DashboardNotificationContextProvider>,
      );

      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });
  });

  describe('useAddNotification', () => {
    it('should add a notification to both dashboard and mod-arch-core contexts', () => {
      const TestComponent: React.FC = () => {
        const addNotification = useAddNotification();
        const { notifications } = useDashboardNotificationContext();

        return (
          <div>
            <button
              data-testid="add-btn"
              onClick={() =>
                addNotification({
                  status: AlertVariant.success,
                  title: 'Test',
                  message: 'Test message',
                  timestamp: new Date('2025-06-01'),
                })
              }
            />
            <div data-testid="count">{notifications.length}</div>
          </div>
        );
      };

      render(
        <DashboardNotificationContextProvider>
          <TestComponent />
        </DashboardNotificationContextProvider>,
      );

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      act(() => {
        screen.getByTestId('add-btn').click();
      });

      expect(screen.getByTestId('count')).toHaveTextContent('1');
      expect(mockModArchDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add_notification',
          payload: expect.objectContaining({
            status: AlertVariant.success,
            title: 'Test',
          }),
        }),
      );
    });

    it('should assign sequential IDs to notifications', () => {
      const TestComponent: React.FC = () => {
        const addNotification = useAddNotification();
        const { notifications } = useDashboardNotificationContext();

        return (
          <div>
            <button
              data-testid="add-btn"
              onClick={() =>
                addNotification({
                  status: AlertVariant.info,
                  title: 'Test',
                  timestamp: new Date(),
                })
              }
            />
            <div data-testid="ids">{notifications.map((n: { id: number }) => n.id).join(',')}</div>
          </div>
        );
      };

      render(
        <DashboardNotificationContextProvider>
          <TestComponent />
        </DashboardNotificationContextProvider>,
      );

      act(() => {
        screen.getByTestId('add-btn').click();
      });
      act(() => {
        screen.getByTestId('add-btn').click();
      });

      const ids = screen.getByTestId('ids').textContent.split(',').map(Number);
      expect(ids).toHaveLength(2);
      expect(ids[1]).toBeGreaterThan(ids[0]);
    });

    it('should forward string message to mod-arch-core dispatch', () => {
      const TestComponent: React.FC = () => {
        const addNotification = useAddNotification();

        return (
          <button
            data-testid="add-btn"
            onClick={() =>
              addNotification({
                status: AlertVariant.danger,
                title: 'Error',
                message: 'A plain string message',
                timestamp: new Date(),
              })
            }
          />
        );
      };

      render(
        <DashboardNotificationContextProvider>
          <TestComponent />
        </DashboardNotificationContextProvider>,
      );

      act(() => {
        screen.getByTestId('add-btn').click();
      });

      expect(mockModArchDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            message: 'A plain string message',
          }),
        }),
      );
    });
  });

  describe('getNextId', () => {
    it('should return incrementing IDs', () => {
      const renderResult = renderHook(() => useDashboardNotificationContext(), { wrapper });

      const id1 = renderResult.result.current.getNextId();
      const id2 = renderResult.result.current.getNextId();

      expect(id2).toBe(id1 + 1);
    });

    it('should seed counter past external mod-arch-core notification IDs', () => {
      const { NotificationContext } = require('mod-arch-core');

      const externalNotifications = [
        { id: 5, status: 'info', title: 'External 1', timestamp: new Date() },
        { id: 10, status: 'warning', title: 'External 2', timestamp: new Date() },
      ];

      const wrapperWithExternal: React.FC<React.PropsWithChildren> = ({ children }) => (
        <NotificationContext.Provider
          value={{
            notifications: externalNotifications,
            notificationCount: 2,
            updateNotificationCount: jest.fn(),
            dispatch: jest.fn(),
          }}
        >
          <DashboardNotificationContextProvider>{children}</DashboardNotificationContextProvider>
        </NotificationContext.Provider>
      );

      const renderResult = renderHook(() => useDashboardNotificationContext(), {
        wrapper: wrapperWithExternal,
      });

      const { result } = renderResult;

      let newId = 0;
      act(() => {
        newId = result.current.getNextId();
      });
      // After sync, getNextId should return an ID greater than the max external ID (10)
      expect(newId).toBeGreaterThan(10);
    });
  });
});
