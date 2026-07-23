import * as React from 'react';

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

const noopEmitter: NotificationEmitter = () => undefined;

const noopNotification: NotificationAPI = {
  success: noopEmitter,
  error: noopEmitter,
  info: noopEmitter,
  warning: noopEmitter,
};

export const NotificationContext = React.createContext<NotificationAPI>(noopNotification);

export const useNotification = (): NotificationAPI => React.useContext(NotificationContext);
