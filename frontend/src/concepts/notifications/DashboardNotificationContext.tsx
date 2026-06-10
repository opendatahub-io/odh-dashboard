import * as React from 'react';
import {
  NotificationContext,
  NotificationActionTypes,
  type Notification as ModArchNotification,
} from 'mod-arch-core';
import {
  DashboardNotification,
  DashboardNotificationActionTypes,
  DashboardNotificationDispatchAction,
} from './types';

type DashboardNotificationContextProps = {
  notifications: DashboardNotification[];
  dispatch: React.Dispatch<DashboardNotificationDispatchAction>;
  getNextId: () => number;
};

export const DashboardNotificationContext = React.createContext<DashboardNotificationContextProps>({
  notifications: [],
  dispatch: () => undefined,
  getNextId: () => 0,
});

const dashboardNotificationReducer = (
  state: DashboardNotification[],
  action: DashboardNotificationDispatchAction,
): DashboardNotification[] => {
  switch (action.type) {
    case DashboardNotificationActionTypes.ADD: {
      return [...state, { ...action.payload, id: action.payload.id ?? -1 }];
    }
    case DashboardNotificationActionTypes.HIDE: {
      const index = state.findIndex((n) => n.id === action.payload.id);
      if (index === -1) {
        return state;
      }
      return [
        ...state.slice(0, index),
        { ...state[index], hidden: true },
        ...state.slice(index + 1),
      ];
    }
    case DashboardNotificationActionTypes.ACK: {
      const index = state.findIndex((n) => n.id === action.payload.id);
      if (index === -1) {
        return state;
      }
      return [
        ...state.slice(0, index),
        { ...state[index], read: true, hidden: true },
        ...state.slice(index + 1),
      ];
    }
    case DashboardNotificationActionTypes.REMOVE: {
      return state.filter((n) => n.id !== action.payload.id);
    }
    default:
      return state;
  }
};

const mapModArchNotification = (n: ModArchNotification): DashboardNotification => ({
  id: n.id,
  status: n.status,
  title: n.title,
  message: n.message,
  hidden: n.hidden,
  read: n.read,
  timestamp: n.timestamp,
});

export const DashboardNotificationContextProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { notifications: modArchNotifications } = React.useContext(NotificationContext);
  const [notifications, dispatch] = React.useReducer(dashboardNotificationReducer, []);
  const lastSyncedIndexRef = React.useRef(0);
  const notificationsRef = React.useRef<DashboardNotification[]>(notifications);
  const idCounterRef = React.useRef(0);

  notificationsRef.current = notifications;

  const getNextId = React.useCallback(() => ++idCounterRef.current, []);

  React.useEffect(() => {
    const newNotifications = modArchNotifications.slice(lastSyncedIndexRef.current);
    lastSyncedIndexRef.current = modArchNotifications.length;

    newNotifications.forEach((modArchNotification) => {
      const alreadyExists = notificationsRef.current.some((n) => n.id === modArchNotification.id);
      if (!alreadyExists) {
        dispatch({
          type: DashboardNotificationActionTypes.ADD,
          payload: mapModArchNotification(modArchNotification),
        });
      }
    });
  }, [modArchNotifications]);

  const contextValue = React.useMemo(
    () => ({ notifications, dispatch, getNextId }),
    [notifications, getNextId],
  );

  return (
    <DashboardNotificationContext.Provider value={contextValue}>
      {children}
    </DashboardNotificationContext.Provider>
  );
};

export const useDashboardNotificationContext = (): DashboardNotificationContextProps =>
  React.useContext(DashboardNotificationContext);

export const useUnreadNotificationCount = (): number => {
  const { notifications } = React.useContext(DashboardNotificationContext);
  return React.useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
};

export const useAddNotification = (): ((notification: DashboardNotification) => void) => {
  const { dispatch: dashboardDispatch, getNextId } = React.useContext(DashboardNotificationContext);
  const { dispatch: modArchDispatch } = React.useContext(NotificationContext);

  return React.useCallback(
    (notification: DashboardNotification) => {
      const id = getNextId();
      const withId = { ...notification, id };

      dashboardDispatch({
        type: DashboardNotificationActionTypes.ADD,
        payload: withId,
      });

      modArchDispatch({
        type: NotificationActionTypes.ADD_NOTIFICATION,
        payload: {
          id,
          status: withId.status,
          title: withId.title,
          message: typeof withId.message === 'string' ? withId.message : undefined,
          timestamp: withId.timestamp,
        },
      });
    },
    [dashboardDispatch, modArchDispatch, getNextId],
  );
};
