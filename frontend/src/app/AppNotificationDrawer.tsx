import React from 'react';
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
  Stack,
  Split,
  SplitItem,
  StackItem,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { AppNotification } from '#~/redux/types';
import { ackNotification, removeNotification } from '#~/redux/actions/actions';
import { calculateRelativeTime } from '#~/utilities/utils';
import { useAppDispatch, useAppSelector } from '#~/redux/hooks';

interface AppNotificationDrawerProps {
  onClose: () => void;
}

const AppNotificationDrawer: React.FC<AppNotificationDrawerProps> = ({ onClose }) => {
  const stateNotifications: AppNotification[] = useAppSelector((state) => state.notifications);
  const notifications = stateNotifications.toSorted(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
  const dispatch = useAppDispatch();
  const newNotifications = React.useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );
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

  return (
    <NotificationDrawer>
      <NotificationDrawerHeader count={newNotifications} onClose={onClose} />
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
                  <Button
                    icon={<TimesIcon aria-hidden="true" />}
                    variant={ButtonVariant.plain}
                    aria-label="remove notification"
                    onClick={() => onRemoveNotification(notification)}
                  />
                </NotificationDrawerListItemHeader>
                <NotificationDrawerListItemBody
                  timestamp={calculateRelativeTime(notification.timestamp, currentTime)}
                >
                  <Stack hasGutter>
                    <StackItem>{notification.message}</StackItem>
                    {notification.actions && notification.actions.length > 0 && (
                      <StackItem>
                        <Split hasGutter isWrappable>
                          {notification.actions.map((action) => (
                            <SplitItem key={action.title}>
                              <Button
                                variant="link"
                                isInline
                                component="a"
                                onClick={action.onClick}
                              >
                                {action.title}
                              </Button>
                            </SplitItem>
                          ))}
                        </Split>
                      </StackItem>
                    )}
                  </Stack>
                </NotificationDrawerListItemBody>
              </NotificationDrawerListItem>
            ))}
          </NotificationDrawerList>
        ) : (
          <EmptyState variant={EmptyStateVariant.sm}>
            <EmptyStateBody>There are no notifications at this time.</EmptyStateBody>
          </EmptyState>
        )}
      </NotificationDrawerBody>
    </NotificationDrawer>
  );
};

export default AppNotificationDrawer;
