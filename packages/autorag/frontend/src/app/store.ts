import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { create } from 'zustand';

export interface AppNotificationAction {
  title: string;
  onClick: () => void;
}

export interface AppNotification {
  id: number;
  status: AlertVariant;
  title: string;
  message?: React.ReactNode;
  actions?: AppNotificationAction[];
  read?: boolean;
  timestamp: Date;
}

interface StoreState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id'>) => void;
  removeNotification: (notificationId: number) => void;
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
  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    })),
}));
