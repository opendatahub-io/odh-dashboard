import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import useNotification from '#~/utilities/useNotification';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import {
  getHumanReadableKueueMessage,
  getPreemptionToastBody,
} from '#~/concepts/kueue/messageUtils';
import { NotebookState } from './types';

const ALERT_STATUSES = [KueueWorkloadStatus.Failed, KueueWorkloadStatus.Preempted];

/**
 * Watches for Kueue status transitions to Failed or Preempted and fires
 * toast notifications. On initial load the current statuses are recorded
 * without firing toasts; only subsequent transitions trigger alerts.
 * Uses a ref to track which notebook+status combinations have already
 * been seen to prevent duplicate toasts.
 */
const useKueueNotebookAlerts = (
  notebookStates: NotebookState[],
  kueueStatusByNotebookName: Record<string, KueueWorkloadStatusWithMessage | null>,
): void => {
  const notification = useNotification();
  const navigate = useNavigate();
  const alertedRef = React.useRef<Record<string, KueueWorkloadStatus | null> | null>(null);

  React.useEffect(() => {
    if (alertedRef.current === null) {
      const initial: Record<string, KueueWorkloadStatus | null> = {};
      for (const state of notebookStates) {
        const { name } = state.notebook.metadata;
        initial[name] = kueueStatusByNotebookName[name]?.status ?? null;
      }
      alertedRef.current = initial;
      return;
    }

    for (const state of notebookStates) {
      const { name } = state.notebook.metadata;
      const currentStatus = kueueStatusByNotebookName[name]?.status ?? null;
      const lastAlerted = alertedRef.current[name] ?? null;

      if (currentStatus === lastAlerted) {
        continue;
      }

      alertedRef.current[name] = currentStatus;

      if (!currentStatus || !ALERT_STATUSES.includes(currentStatus)) {
        continue;
      }

      const kueueInfo = kueueStatusByNotebookName[name];
      if (!kueueInfo) {
        continue;
      }

      const displayName = getDisplayNameFromK8sResource(state.notebook);
      const projectName = state.notebook.metadata.namespace;

      if (currentStatus === KueueWorkloadStatus.Failed) {
        const reason = getHumanReadableKueueMessage(
          kueueInfo.status,
          kueueInfo.message,
          kueueInfo.queueName,
        );
        notification.error(`Workbench ${displayName} failed to start`, reason, [
          {
            title: 'View details',
            onClick: () => navigate(`/projects/${projectName}`),
          },
        ]);
      } else if (currentStatus === KueueWorkloadStatus.Preempted) {
        const body = getPreemptionToastBody(displayName, kueueInfo.timestamp);
        notification.warning(`Workbench ${displayName} was preempted`, body, [
          {
            title: 'View details',
            onClick: () => navigate(`/projects/${projectName}`),
          },
        ]);
      }
    }
  }, [notebookStates, kueueStatusByNotebookName, notification, navigate]);
};

export default useKueueNotebookAlerts;
