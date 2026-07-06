import React from 'react';
import type { Notification } from 'mod-arch-core';
export type NotificationLinkOptions = Pick<Notification, 'linkUrl' | 'linkLabel' | 'messageText'>;
declare enum NotificationTypes {
    SUCCESS = "success",
    ERROR = "error",
    INFO = "info",
    WARNING = "warning"
}
type NotificationProps = (title: string, message?: React.ReactNode, options?: NotificationLinkOptions) => void;
type NotificationRemoveProps = (id: number | undefined) => void;
type NotificationTypeFunc = {
    [key in NotificationTypes]: NotificationProps;
};
interface NotificationFunc extends NotificationTypeFunc {
    remove: NotificationRemoveProps;
}
export declare const useNotification: () => NotificationFunc;
export {};
