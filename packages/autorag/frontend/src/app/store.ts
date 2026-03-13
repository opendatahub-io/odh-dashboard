import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { create } from 'zustand';

export interface AppNotificationAction {
  title: string;
  onClick: () => void;
}

export interface AppNotification {
  id?: number;
  status: AlertVariant;
  title: string;
  message?: React.ReactNode;
  actions?: AppNotificationAction[];
  hidden?: boolean;
  read?: boolean;
  timestamp: Date;
}

interface StoreState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id'>) => void;
  hideNotification: (notification: AppNotification) => void;
  ackNotification: (notification: AppNotification) => void;
  removeNotification: (notification: AppNotification) => void;
}

let notificationCount = 0;

export const useStore = create<StoreState>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: ++notificationCount,
        },
      ],
    })),
  hideNotification: (notification) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notification.id ? { ...n, hidden: true } : n,
      ),
    })),
  ackNotification: (notification) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notification.id),
    })),
  removeNotification: (notification) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notification.id),
    })),
}));
