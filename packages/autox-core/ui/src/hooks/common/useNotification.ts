import { AlertVariant } from '@patternfly/react-core';
import React from 'react';

/**
 * Structurally compatible with each product's own `AppNotificationAction` (kept product-local,
 * defined next to that product's notification store) — see `createUseNotification`'s doc comment
 * for why the store itself isn't shared.
 */
export type NotificationAction = {
  title: string;
  onClick: () => void;
};

enum NotificationTypes {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

type NotificationProps = (
  title: string,
  message?: React.ReactNode,
  actions?: NotificationAction[],
) => void;

type NotificationRemoveProps = (id: string) => void;

type NotificationTypeFunc = {
  [key in NotificationTypes]: NotificationProps;
};

export interface NotificationFunc extends NotificationTypeFunc {
  remove: NotificationRemoveProps;
}

type AddNotification = (notification: {
  status: AlertVariant;
  title: string;
  message?: React.ReactNode;
  actions?: NotificationAction[];
  timestamp: Date;
}) => void;

type RemoveNotification = (id: string) => void;

/**
 * Creates a `useNotification` hook bound to a product's own notification store.
 *
 * The zustand store itself is deliberately kept product-local (not shared here): AutoML and
 * AutoRAG are separate Module Federation remotes that can both be mounted in the same host SPA
 * session, and `@odh-dashboard/autox-core` is loaded as a singleton shared dependency — a shared
 * store instance would leak one product's toast notifications into the other's `<ToastNotifications
 * />` tree after an in-SPA route change. Instead each product supplies its own store's
 * `addNotification`/`removeNotification` selectors (kept as separate hook calls, mirroring the
 * original `useStore((state) => state.xyz)` selector usage, so only the selected slice triggers a
 * re-render).
 *
 * @param useAddNotification - Selector hook returning the product's store's `addNotification` action.
 * @param useRemoveNotification - Selector hook returning the product's store's `removeNotification` action.
 *
 * @example
 * export const useNotification = createUseNotification(
 *   () => useStore((state) => state.addNotification),
 *   () => useStore((state) => state.removeNotification),
 * );
 */
export function createUseNotification(
  useAddNotification: () => AddNotification,
  useRemoveNotification: () => RemoveNotification,
): () => NotificationFunc {
  /**
   * Hook for displaying toast notifications throughout the application.
   * Provides methods to show success, error, info, and warning notifications
   * with optional messages and action links.
   *
   * All notifications are automatically added to the product's notification store
   * and will appear as toast messages with an 8-second auto-dismiss timeout
   * (see ToastNotification component for timeout behavior).
   *
   * @returns Object with notification methods:
   * - `success(title, message?, actions?)` - Display success notification (green)
   * - `error(title, message?, actions?)` - Display error notification (red)
   * - `info(title, message?, actions?)` - Display info notification (blue)
   * - `warning(title, message?, actions?)` - Display warning notification (gold)
   * - `remove(id)` - Manually remove a notification by ID
   */
  return function useNotification(): NotificationFunc {
    const addNotification = useAddNotification();
    const removeNotification = useRemoveNotification();

    const success: NotificationProps = React.useCallback(
      (title, message?, actions?) => {
        addNotification({
          status: AlertVariant.success,
          title,
          message,
          actions,
          timestamp: new Date(),
        });
      },
      [addNotification],
    );

    const warning: NotificationProps = React.useCallback(
      (title, message?, actions?) => {
        addNotification({
          status: AlertVariant.warning,
          title,
          message,
          actions,
          timestamp: new Date(),
        });
      },
      [addNotification],
    );

    const error: NotificationProps = React.useCallback(
      (title, message?, actions?) => {
        addNotification({
          status: AlertVariant.danger,
          title,
          message,
          actions,
          timestamp: new Date(),
        });
      },
      [addNotification],
    );

    const info: NotificationProps = React.useCallback(
      (title, message?, actions?) => {
        addNotification({
          status: AlertVariant.info,
          title,
          message,
          actions,
          timestamp: new Date(),
        });
      },
      [addNotification],
    );

    const remove: NotificationRemoveProps = React.useCallback(
      (id) => {
        removeNotification(id);
      },
      [removeNotification],
    );

    const notification = React.useMemo(
      () => ({ success, error, info, warning, remove }),
      [success, error, info, warning, remove],
    );

    return notification;
  };
}
