import { Alert, AlertActionCloseButton, AlertActionLink } from '@patternfly/react-core';
import React from 'react';
import { AppNotification, useStore } from '~/app/store';

const TOAST_NOTIFICATION_TIMEOUT = 8 * 1000;

interface ToastNotificationProps {
  notification: AppNotification;
}

/**
 * Toast notification component that displays temporary alert messages with
 * automatic timeout and smart pause behavior.
 *
 * The notification automatically dismisses after 8 seconds, but pauses the
 * timeout when the user hovers over or focuses within the alert. This prevents
 * accidental dismissal while the user is reading or interacting with the notification.
 *
 * Timeout behavior:
 * - Starts countdown immediately upon mount (8 seconds)
 * - Pauses when user hovers over the notification
 * - Pauses when notification or any child element receives focus
 * - Resumes countdown when user moves mouse away AND focus leaves the notification
 * - Can be manually dismissed via the close button
 *
 * @param props - Component props
 * @param props.notification - Notification object containing status, title, message, and optional actions
 *
 * @example
 * // Notification will auto-dismiss after 8 seconds
 * <ToastNotification
 *   notification={{
 *     id: '123',
 *     status: 'success',
 *     title: 'Experiment created',
 *     message: 'Your experiment has been successfully created',
 *     timestamp: new Date()
 *   }}
 * />
 *
 * @example
 * // With action links that pause timeout on hover/focus
 * <ToastNotification
 *   notification={{
 *     id: '456',
 *     status: 'info',
 *     title: 'Processing complete',
 *     message: 'Your model is ready',
 *     actions: [{ title: 'View results', onClick: handleView }],
 *     timestamp: new Date()
 *   }}
 * />
 */
const ToastNotification: React.FC<ToastNotificationProps> = ({ notification }) => {
  const { removeNotification } = useStore();

  const [timedOut, setTimedOut] = React.useState(false);
  const [mouseOver, setMouseOver] = React.useState(false);
  const [focusWithin, setFocusWithin] = React.useState(false);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setTimedOut(true);
    }, TOAST_NOTIFICATION_TIMEOUT);
    return () => {
      clearTimeout(handle);
    };
  }, []);

  React.useEffect(() => {
    if (timedOut && !mouseOver && !focusWithin) {
      removeNotification(notification.id);
    }
  }, [focusWithin, mouseOver, notification, removeNotification, timedOut]);

  return (
    <Alert
      variant={notification.status}
      data-testid="toast-notification-alert"
      title={notification.title}
      actionClose={<AlertActionCloseButton onClose={() => removeNotification(notification.id)} />}
      actionLinks={
        notification.actions && (
          <>
            {notification.actions.map((action) => (
              <AlertActionLink key={action.title} onClick={action.onClick}>
                {action.title}
              </AlertActionLink>
            ))}
          </>
        )
      }
      onMouseEnter={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
    >
      {notification.message}
    </Alert>
  );
};

export default ToastNotification;
