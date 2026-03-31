import * as React from 'react';

/**
 * Notification severity levels for toast notifications.
 */
export type AppNotificationStatus = 'success' | 'error' | 'info' | 'warning';

/**
 * A clickable action rendered within a toast notification.
 */
export type AppNotificationAction = {
  title: string;
  onClick: () => void;
};

/**
 * Functions for dispatching toast notifications by severity.
 *
 * Each function accepts:
 * - `title` — the notification headline
 * - `message` — optional body content (supports React nodes for links, bold text, etc.)
 * - `actions` — optional clickable actions rendered as buttons within the notification
 */
export type AppNotificationActions = {
  success: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => void;
  error: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => void;
  info: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => void;
  warning: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => void;
};

/**
 * Handle returned by `openModal` that allows programmatic control of the modal.
 */
export type ModalRef = {
  close: () => void;
};

/**
 * App-level actions that extension functions can invoke without needing
 * direct access to React context, hooks, or Redux.
 *
 * Obtain an instance via the `useAppActions()` hook in React code, or
 * receive one as a parameter in extension callback functions.
 */
export type AppActions = {
  /** Navigate to an in-app route. */
  navigate: (path: string) => void;

  /** Dispatch a toast notification. */
  notification: AppNotificationActions;

  /**
   * Open a modal component.
   *
   * TypeScript infers the required props from the component type and enforces
   * them on the `props` argument. The host always handles unmounting the modal;
   * if the caller passes `onClose` in `props`, it is composed with the internal
   * cleanup so both run when the modal closes. Arguments passed to `onClose` by
   * the modal component (e.g. a confirmation boolean) are forwarded to the
   * caller's `onClose`.
   *
   * Returns a `ModalRef` that can programmatically close the modal.
   *
   * @example
   * ```ts
   * // Simple — host provides onClose automatically
   * actions.openModal(ConfirmDeleteModal, { resourceName: 'my-model' });
   *
   * // With close callback that receives modal arguments
   * actions.openModal(StopModal, {
   *   modelName: 'my-model',
   *   onClose: (confirmed: boolean) => { if (confirmed) stopDeployment(); },
   * });
   *
   * // Lazy loaded via React.lazy
   * const LazyModal = React.lazy(() => import('./HeavyModal'));
   * actions.openModal(LazyModal, { data });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openModal: <P extends { onClose: (...args: any[]) => void }>(
    component: React.ComponentType<P>,
    props?: Partial<Pick<P, 'onClose'>> & Omit<P, 'onClose'>,
  ) => ModalRef;
};

/**
 * React context that carries the current `AppActions` instance.
 *
 * The host application provides this via `AppActionsProvider`.
 * Extensions consume it via `useAppActions()`.
 */
export const AppActionsContext = React.createContext<AppActions | null>(null);

/**
 * Returns the current `AppActions` instance.
 *
 * Must be called within an `AppActionsProvider`.
 */
export const useAppActions = (): AppActions => {
  const ctx = React.useContext(AppActionsContext);
  if (!ctx) {
    throw new Error('useAppActions must be used within an AppActionsProvider');
  }
  return ctx;
};
