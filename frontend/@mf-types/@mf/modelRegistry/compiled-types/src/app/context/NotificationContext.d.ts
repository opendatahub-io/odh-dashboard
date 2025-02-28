import React from 'react';
import { Notification, NotificationAction } from '~/app/types';
type NotificationContextProps = {
    notifications: Notification[];
    notificationCount: number;
    updateNotificationCount: React.Dispatch<React.SetStateAction<number>>;
    dispatch: React.Dispatch<NotificationAction>;
};
export declare const NotificationContext: React.Context<NotificationContextProps>;
type NotificationContextProviderProps = {
    children: React.ReactNode;
};
export declare const NotificationContextProvider: React.FC<NotificationContextProviderProps>;
export {};
