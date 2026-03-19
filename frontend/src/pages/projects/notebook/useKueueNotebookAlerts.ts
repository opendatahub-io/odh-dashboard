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

const ALERT_STATUSES = new Set([KueueWorkloadStatus.Failed, KueueWorkloadStatus.Preempted]);

const buildSnapshot = (
  notebookStates: NotebookState[],
  statusMap: Record<string, KueueWorkloadStatusWithMessage | null>,
): Record<string, KueueWorkloadStatus | null> => {
  const snapshot: Record<string, KueueWorkloadStatus | null> = {};
  for (const state of notebookStates) {
    const { name } = state.notebook.metadata;
    snapshot[name] = statusMap[name]?.status ?? null;
  }
  return snapshot;
};

const fireAlert = (
  notification: ReturnType<typeof useNotification>,
  navigate: ReturnType<typeof useNavigate>,
  state: NotebookState,
  kueueInfo: KueueWorkloadStatusWithMessage,
): void => {
  const displayName = getDisplayNameFromK8sResource(state.notebook);
  const projectName = state.notebook.metadata.namespace;
  const actions = [
    {
      title: 'View details',
      onClick: () => navigate(`/projects/${projectName}`),
    },
  ];

  if (kueueInfo.status === KueueWorkloadStatus.Failed) {
    const reason = getHumanReadableKueueMessage(
      kueueInfo.status,
      kueueInfo.message,
      kueueInfo.queueName,
    );
    notification.error(`Workbench ${displayName} failed to start`, reason, actions);
  } else if (kueueInfo.status === KueueWorkloadStatus.Preempted) {
    const body = getPreemptionToastBody(displayName, kueueInfo.timestamp);
    notification.warning(`Workbench ${displayName} was preempted`, body, actions);
  }
};

/**
 * Watches for Kueue status transitions to Failed or Preempted and fires
 * toast notifications. Waits until Kueue data is loaded before recording
 * the baseline snapshot so that pre-existing statuses don't trigger
 * false alerts on page load.
 */
const useKueueNotebookAlerts = (
  notebookStates: NotebookState[],
  kueueStatusByNotebookName: Record<string, KueueWorkloadStatusWithMessage | null>,
  isKueueLoaded: boolean,
): void => {
  const notification = useNotification();
  const navigate = useNavigate();
  const prevStatusRef = React.useRef<Record<string, KueueWorkloadStatus | null> | null>(null);

  React.useEffect(() => {
    if (!isKueueLoaded) {
      return;
    }

    const snapshot = buildSnapshot(notebookStates, kueueStatusByNotebookName);

    if (prevStatusRef.current !== null) {
      for (const state of notebookStates) {
        const { name } = state.notebook.metadata;
        const current = snapshot[name];
        const previous = prevStatusRef.current[name] ?? null;

        const kueueInfo = kueueStatusByNotebookName[name];
        if (current && current !== previous && ALERT_STATUSES.has(current) && kueueInfo) {
          fireAlert(notification, navigate, state, kueueInfo);
        }
      }
    }

    prevStatusRef.current = snapshot;
  }, [isKueueLoaded, notebookStates, kueueStatusByNotebookName, notification, navigate]);
};

export default useKueueNotebookAlerts;
