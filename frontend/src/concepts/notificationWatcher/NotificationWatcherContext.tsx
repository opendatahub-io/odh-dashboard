import * as React from 'react';
import { AppNotification } from '#~/redux/types';
import useNotification from '#~/utilities/useNotification';
import { POLL_INTERVAL } from '#~/utilities/const';

export type NotificationWatcherContextType = {
  registerNotification: (item: NotificationWatcherItem) => void;
  unregisterNotification: (id: symbol) => void;
};

type NotificationWatcherContextProviderProps = {
  children: React.ReactNode;
};

export enum NotificationResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  STOP = 'stop',
  REPOLL = 'repoll',
}

export type FinalNotificationWatcherResponse =
  | ({ status: NotificationResponseStatus.SUCCESS | NotificationResponseStatus.ERROR } & Pick<
      AppNotification,
      'title' | 'message' | 'actions'
    >)
  | { status: NotificationResponseStatus.STOP };

export type RepollNotificationWatcherResponse = { status: NotificationResponseStatus.REPOLL };

export type NotificationWatcherResponse =
  | FinalNotificationWatcherResponse
  | RepollNotificationWatcherResponse;

export type NotificationWatcherCallback = (
  signal: AbortSignal,
) => Promise<NotificationWatcherResponse>;

export type NotificationWatcherItem = {
  callbackDelay?: number;
  callback: NotificationWatcherCallback;
  /**
   * Optionally provided to unregister the notification listener async
   */
  id?: symbol;
};

export const NotificationWatcherContext = React.createContext<NotificationWatcherContextType>({
  registerNotification: () => undefined,
  unregisterNotification: () => undefined,
});

export const NotificationWatcherContextProvider: React.FC<
  NotificationWatcherContextProviderProps
> = ({ children }) => {
  const notification = useNotification();
  const abortControllersMapRef = React.useRef(new Map<NotificationWatcherItem, AbortController>());
  const timeoutIdsMapRef = React.useRef(
    new Map<NotificationWatcherItem, ReturnType<typeof setTimeout>>(),
  );

  const invoke = React.useCallback(
    (itemToInvoke: NotificationWatcherItem, signal: AbortSignal) => {
      const callbackDelay = itemToInvoke.callbackDelay ?? POLL_INTERVAL;

      itemToInvoke
        .callback(signal)
        .then((response) => {
          if (response.status !== NotificationResponseStatus.REPOLL) {
            abortControllersMapRef.current.delete(itemToInvoke);
          }

          if (signal.aborted) {
            return;
          }

          const { status } = response;
          switch (status) {
            case NotificationResponseStatus.SUCCESS:
              notification.success(response.title, response.message, response.actions);
              break;
            case NotificationResponseStatus.ERROR:
              notification.error(response.title, response.message, response.actions);
              break;
            case NotificationResponseStatus.REPOLL: {
              const timeoutId = setTimeout(() => {
                timeoutIdsMapRef.current.delete(itemToInvoke);
                invoke(itemToInvoke, signal);
              }, callbackDelay);
              timeoutIdsMapRef.current.set(itemToInvoke, timeoutId);
              break;
            }
            case NotificationResponseStatus.STOP:
              // Do nothing more
              break;
            default: {
              // If you see a compilation error here, it means that you have added a new status to the
              // NotificationWatcherResponse type but forgot to handle it in the switch statement above.
              const value: never = status;
              // eslint-disable-next-line no-console
              console.error('Unreachable code', value);
            }
          }
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Uncaught error:', error);
        });
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

  const registerNotification = React.useCallback(
    (item: NotificationWatcherItem): void => {
      const abortController = new AbortController();
      abortControllersMapRef.current.set(item, abortController);
      invoke(item, abortController.signal);
    },
    [invoke],
  );

  const unregisterNotification = React.useCallback((id: symbol) => {
    timeoutIdsMapRef.current.forEach((value, key) => {
      if (key.id === id) {
        clearTimeout(value);
      }
    });
    abortControllersMapRef.current.forEach((value, key) => {
      if (key.id === id) {
        value.abort();
      }
    });
  }, []);

  const contextValue = React.useMemo(
    () => ({ registerNotification, unregisterNotification }),
    [registerNotification, unregisterNotification],
  );

  return (
    <NotificationWatcherContext.Provider value={contextValue}>
      {children}
    </NotificationWatcherContext.Provider>
  );
};
