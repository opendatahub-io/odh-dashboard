import React from 'react';
import { Notification } from 'mod-arch-core';
interface ToastNotificationProps {
    notification: Notification;
}
declare const ToastNotification: React.FC<ToastNotificationProps>;
export default ToastNotification;
