import React from 'react';
declare enum NotificationTypes {
    SUCCESS = "success",
    ERROR = "error",
    INFO = "info",
    WARNING = "warning"
}
type NotificationProps = (title: string, message?: React.ReactNode) => void;
type NotificationRemoveProps = (id: number | undefined) => void;
type NotificationTypeFunc = {
    [key in NotificationTypes]: NotificationProps;
};
interface NotificationFunc extends NotificationTypeFunc {
    remove: NotificationRemoveProps;
}
export declare const useNotification: () => NotificationFunc;
export {};
