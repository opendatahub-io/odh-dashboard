import * as React from 'react';
import { AppNotification } from '~/redux/types';

type NotificationsContext = {
  notifications: AppNotification[];
  addNotification: (status: AppNotification['status'], title: string, message: string) => void;
};

export const NotificationsContext = React.createContext<NotificationsContext>({
  notifications: [],
  addNotification: () => undefined,
});

type NotificationsProviderProps = {
  children: React.ReactNode;
};

const NotificationsContextProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);

  const addNotification = React.useCallback(
    (status: AppNotification['status'], title: string, message: string) => {
      const newNotification = {
        status,
        title,
        message,
        timestamp: new Date(),
      };

      setNotifications([...notifications, newNotification]);
    },
    [notifications],
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
export default NotificationsContextProvider;
