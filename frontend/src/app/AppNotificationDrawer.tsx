import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  ButtonVariant,
  NotificationDrawer,
  NotificationDrawerHeader,
  NotificationDrawerBody,
  NotificationDrawerList,
  NotificationDrawerListItem,
  NotificationDrawerListItemHeader,
  NotificationDrawerListItemBody,
  EmptyStateVariant,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { AppNotification, State } from '../redux/types';
import { ackNotification, removeNotification } from '../redux/actions/actions';
import { calculateRelativeTime } from '../utilities/utils';

interface AppNotificationDrawerProps {
  onClose: () => void;
}

const AppNotificationDrawer: React.FC<AppNotificationDrawerProps> = ({ onClose }) => {
  const notifications: AppNotification[] = useSelector<State, AppNotification[]>(
    (state) => state.appState.notifications,
  ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const dispatch = useDispatch();
  const newNotifications = React.useMemo(() => {
    return notifications.filter((notification) => !notification.read).length;
  }, [notifications]);
  const [currentTime, setCurrentTime] = React.useState<Date>(new Date());

  React.useEffect(() => {
    const timeHandle = setInterval(() => setCurrentTime(new Date()), 20 * 1000);
    return () => {
      clearInterval(timeHandle);
    };
  }, []);

  const markNotificationRead = (notification: AppNotification): void => {
    dispatch(ackNotification(notification));
  };

  const onRemoveNotification = (notification: AppNotification): void => {
    dispatch(removeNotification(notification));
  };

  // FIXME: Remove blank item from NotificationDrawerHeader when https://github.com/patternfly/patternfly-react/issues/5924 is resolved
  return (
    <NotificationDrawer className="odh-dashboard__notification-drawer">
      <NotificationDrawerHeader count={newNotifications} onClose={onClose}>
        {` `}
      </NotificationDrawerHeader>
      <NotificationDrawerBody>
        {notifications.length ? (
          <NotificationDrawerList>
            {notifications.map((notification) => (
              <NotificationDrawerListItem
                key={notification.id}
                variant={notification.status}
                onClick={() => markNotificationRead(notification)}
                isRead={notification.read}
              >
                <NotificationDrawerListItemHeader
                  variant={notification.status}
                  title={notification.title}
                >
                  <div>
                    <Button
                      className="odh-dashboard__notification-drawer__item-remove"
                      variant={ButtonVariant.plain}
                      aria-label="remove notification"
                      onClick={() => onRemoveNotification(notification)}
                    >
                      <TimesIcon aria-hidden="true" />
                    </Button>
                  </div>
                </NotificationDrawerListItemHeader>
                <NotificationDrawerListItemBody
                  timestamp={calculateRelativeTime(notification.timestamp, currentTime)}
                  className={notification.message ? '' : 'm-is-hidden'}
                >
                  {notification.message}
                </NotificationDrawerListItemBody>
              </NotificationDrawerListItem>
            ))}
          </NotificationDrawerList>
        ) : (
          <EmptyState variant={EmptyStateVariant.small}>
            <EmptyStateBody>There are no notifications at this time.</EmptyStateBody>
          </EmptyState>
        )}
      </NotificationDrawerBody>
    </NotificationDrawer>
  );
};

export default AppNotificationDrawer;
