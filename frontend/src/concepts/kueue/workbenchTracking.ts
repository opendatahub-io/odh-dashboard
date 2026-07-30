import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { getKueueStatusInfo } from '#~/concepts/kueue';
import { getKueueAnalyticsSubState } from '#~/concepts/kueue/messageUtils';
import {
  KUEUE_STATUSES_OVERRIDE_WORKBENCH,
  type KueueWorkloadStatusWithMessage,
} from '#~/concepts/kueue/types';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '#~/concepts/analyticsTracking/segmentIOUtils';

/** Segment event names for Workbench analytics (lifecycle + Kueue status UX). */
export enum WorkbenchTrackingEvent {
  Created = 'Workbench Created',
  Updated = 'Workbench Updated',
  Started = 'Workbench Started',
  Stopped = 'Workbench Stopped',
  Deleted = 'Workbench Deleted',
  StatusLogViewed = 'Workbench Status Log Viewed',
  StatusModalTabSwitched = 'Workbench Status Modal Tab Switched',
  StatusModalActionClicked = 'Workbench Status Modal Action Clicked',
  ProgressStepExpanded = 'Workbench Progress Step Expanded',
  StatusToastActionClicked = 'Workbench Status Toast Action Clicked',
}

export type WorkbenchKueueTrackingInput = {
  kueueStatus: KueueWorkloadStatusWithMessage | null;
  isStarting?: boolean;
  isRunning?: boolean;
  isStopping?: boolean;
  /** Queue name when status object is not available yet (e.g. create form). */
  kueueQueueName?: string;
};

export type WorkbenchKueueTrackingProperties = {
  kueueQueueName?: string;
  queuePosition?: number;
  queueTotal?: number;
  primaryWorkbenchStatus: string;
  isKueueBlocking: boolean;
  kueueSubState: string;
};

// Keep priority in sync with NotebookStatusLabel.tsx (omits Failed without notebookStatus).
const getPrimaryWorkbenchStatus = ({
  isStarting = false,
  isStopping = false,
  isRunning = false,
  kueueStatus,
}: WorkbenchKueueTrackingInput): string => {
  if (isStopping) {
    return 'Stopping';
  }
  if (kueueStatus?.status && KUEUE_STATUSES_OVERRIDE_WORKBENCH.includes(kueueStatus.status)) {
    return getKueueStatusInfo(kueueStatus.status).label;
  }
  if (isStarting) {
    return 'Starting';
  }
  if (isRunning) {
    return 'Ready';
  }
  return 'Stopped';
};

export const getWorkbenchKueueTrackingProperties = (
  input: WorkbenchKueueTrackingInput,
): WorkbenchKueueTrackingProperties => {
  const { kueueStatus } = input;
  const queueName = input.kueueQueueName || kueueStatus?.queueName;

  return {
    ...(queueName && { kueueQueueName: queueName }),
    ...(kueueStatus?.queuePosition != null && { queuePosition: kueueStatus.queuePosition }),
    ...(kueueStatus?.queueTotal != null && { queueTotal: kueueStatus.queueTotal }),
    primaryWorkbenchStatus: getPrimaryWorkbenchStatus(input),
    isKueueBlocking: Boolean(
      kueueStatus?.status && KUEUE_STATUSES_OVERRIDE_WORKBENCH.includes(kueueStatus.status),
    ),
    kueueSubState: getKueueAnalyticsSubState(kueueStatus),
  };
};

export const fireWorkbenchStatusModalAction = (
  action: string,
  outcome: TrackingOutcome,
  activeTab: string,
  input: WorkbenchKueueTrackingInput,
): void => {
  const { primaryWorkbenchStatus, kueueSubState, isKueueBlocking } =
    getWorkbenchKueueTrackingProperties(input);
  fireFormTrackingEvent(WorkbenchTrackingEvent.StatusModalActionClicked, {
    outcome,
    action,
    activeTab,
    primaryWorkbenchStatus,
    kueueSubState,
    isKueueBlocking,
  });
};

export const fireWorkbenchProgressStepExpanded = (
  stepName: string,
  kueueStatus: KueueWorkloadStatusWithMessage | null | undefined,
): void => {
  fireMiscTrackingEvent(WorkbenchTrackingEvent.ProgressStepExpanded, {
    stepName,
    kueueSubState: getKueueAnalyticsSubState(kueueStatus),
  });
};

export const fireWorkbenchStatusToastAction = (
  action: string,
  kueueStatus: KueueWorkloadStatusWithMessage | null | undefined,
): void => {
  fireMiscTrackingEvent(WorkbenchTrackingEvent.StatusToastActionClicked, {
    action,
    kueueSubState: getKueueAnalyticsSubState(kueueStatus),
  });
};
