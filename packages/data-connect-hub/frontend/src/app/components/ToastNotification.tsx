import React from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  AlertVariant,
} from '@patternfly/react-core';
import { asEnumMember, type Notification } from 'mod-arch-core';
import { useNotification } from '~/app/hooks/useNotification';

const TOAST_TIMEOUT = 8 * 1000;

type ToastActionLinkProps = React.HTMLAttributes<HTMLAnchorElement> & { href: string };

const ToastActionLink: React.FC<ToastActionLinkProps> = ({ href, ...props }) => (
  <Link {...props} to={href} />
);

const ToastNotification: React.FC<{ notification: Notification }> = ({ notification }) => {
  const notifications = useNotification();
  const { linkUrl, linkLabel } = notification;
  const [mouseOver, setMouseOver] = React.useState(false);
  const remainingRef = React.useRef(TOAST_TIMEOUT);
  const startRef = React.useRef(Date.now());

  React.useEffect(() => {
    if (mouseOver || notification.hidden) {
      return;
    }

    startRef.current = Date.now();
    const timeout = window.setTimeout(
      () => notifications.remove(notification.id),
      Math.max(0, remainingRef.current),
    );

    return () => {
      remainingRef.current -= Date.now() - startRef.current;
      window.clearTimeout(timeout);
    };
  }, [mouseOver, notification, notifications]);

  if (notification.hidden) {
    return null;
  }

  return (
    <Alert
      variant={asEnumMember(notification.status, AlertVariant) ?? undefined}
      data-testid="toast-notification-alert"
      title={notification.title}
      actionClose={<AlertActionCloseButton onClose={() => notifications.remove(notification.id)} />}
      actionLinks={
        linkUrl && linkLabel ? (
          <AlertActionLink component={ToastActionLink} href={linkUrl}>
            {linkLabel}
          </AlertActionLink>
        ) : undefined
      }
      onMouseEnter={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
    >
      {notification.message}
    </Alert>
  );
};

export default ToastNotification;
