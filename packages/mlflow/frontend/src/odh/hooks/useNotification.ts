import React from 'react';
import { AlertVariant } from '@patternfly/react-core';

const NOTIFICATION_BRIDGE_EVENT = 'odh-notification-bridge';

export type NotificationAction = {
  title: string;
  onClick: () => void;
};

type NotificationEmitter = (
  title: string,
  message?: React.ReactNode,
  actions?: NotificationAction[],
) => void;

export type NotificationAPI = {
  success: NotificationEmitter;
  error: NotificationEmitter;
  info: NotificationEmitter;
  warning: NotificationEmitter;
};

const dispatchNotification = (status: AlertVariant, title: string, message?: React.ReactNode) => {
  try {
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_BRIDGE_EVENT, {
        detail: {
          status,
          title,
          message: typeof message === 'string' ? message : undefined,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[NotificationBridge] Failed to dispatch notification:', error);
  }
};

/** Notification API that bridges to the host's toast/drawer via a window CustomEvent. */
export const useNotification = (): NotificationAPI =>
  React.useMemo(
    () => ({
      success: (title, message) => dispatchNotification(AlertVariant.success, title, message),
      error: (title, message) => dispatchNotification(AlertVariant.danger, title, message),
      info: (title, message) => dispatchNotification(AlertVariant.info, title, message),
      warning: (title, message) => dispatchNotification(AlertVariant.warning, title, message),
    }),
    [],
  );
