import * as React from 'react';
import { AppNotification } from '~/redux/types';
import useNotification from '~/utilities/useNotification';

export type NotificationPollerContextType = {
  watchForNotification: (item: NotificationPollerItem) => Promise<void>;
};

type NotificationPollerContextProviderProps = {
  children: React.ReactNode;
};

export type FinalNotificationPollerResponse =
  | ({ status: 'success' | 'error' } & Pick<AppNotification, 'title' | 'message' | 'actions'>)
  | { status: 'stop' };

export type NotificationPollerResponse = FinalNotificationPollerResponse | { status: 'repoll' };

export type NotificationCallback = (signal: AbortSignal) => Promise<NotificationPollerResponse>;

export type NotificationPollerItem = {
  delayRepollMs?: number;
  callback: NotificationCallback;
};

export const NotificationPollerContext = React.createContext<NotificationPollerContextType>({
  watchForNotification: () => Promise.resolve(),
});

const DEFAULT_REPOLL_INTERVAL_MS = 0;

export const NotificationPollerContextProvider: React.FC<
  NotificationPollerContextProviderProps
> = ({ children }) => {
  const notification = useNotification();
  const abortControllersMapRef = React.useRef(new Map<NotificationPollerItem, AbortController>());
  const timeoutIdsMapRef = React.useRef(
    new Map<NotificationPollerItem, ReturnType<typeof setTimeout>>(),
  );

  const invoke = React.useCallback(
    async (itemToInvoke: NotificationPollerItem, signal: AbortSignal) => {
      const delayRepollMs = itemToInvoke.delayRepollMs ?? DEFAULT_REPOLL_INTERVAL_MS;
      const response = await itemToInvoke.callback(signal);

      if (signal.aborted) {
        return;
      }

      if (response.status === 'repoll') {
        const timeoutId = setTimeout(async () => {
          timeoutIdsMapRef.current.delete(itemToInvoke);
          await invoke(itemToInvoke, signal);
        }, delayRepollMs);

        timeoutIdsMapRef.current.set(itemToInvoke, timeoutId);
        return;
      }

      abortControllersMapRef.current.delete(itemToInvoke);

      if (response.status === 'success') {
        notification.success(response.title, response.message, response.actions);
      } else if (response.status === 'error') {
        notification.error(response.title, response.message, response.actions);
      }
    },
    [notification],
  );

  React.useEffect(
    () => () => {
      timeoutIdsMapRef.current.forEach(clearTimeout);
      timeoutIdsMapRef.current.clear();

      abortControllersMapRef.current.forEach((abortController) => abortController.abort());
      abortControllersMapRef.current.clear();
    },
    [],
  );

  const watchForNotification = React.useCallback(
    (item: NotificationPollerItem): Promise<void> => {
      const abortController = new AbortController();
      abortControllersMapRef.current.set(item, abortController);
      return invoke(item, abortController.signal);
    },
    [invoke],
  );

  const contextValue = React.useMemo(() => ({ watchForNotification }), [watchForNotification]);

  return (
    <NotificationPollerContext.Provider value={contextValue}>
      {children}
    </NotificationPollerContext.Provider>
  );
};
