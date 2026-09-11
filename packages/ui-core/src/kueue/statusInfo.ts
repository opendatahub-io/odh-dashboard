import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  OutlinedClockIcon,
} from '@patternfly/react-icons';
import {
  KueueWorkloadStatus,
  type KueueWorkloadStatusWithMessage,
} from '@odh-dashboard/k8s-core/kueue/types';
import { getDeploymentKueueSubStepMessage } from '@odh-dashboard/k8s-core/kueue/messageUtils';
import { getKueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import type { GenericConditionStatus } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import type { KueueStatusInfo } from './types';

export { getKueueWorkloadStatusWithMessage };

export const getKueueStatusInfo = (status: KueueWorkloadStatus): KueueStatusInfo => {
  switch (status) {
    case KueueWorkloadStatus.Queued:
      return { label: 'Queued', color: 'grey', IconComponent: OutlinedClockIcon };
    case KueueWorkloadStatus.Failed:
      return {
        label: 'Failed',
        status: 'danger',
        IconComponent: ExclamationCircleIcon,
      };
    case KueueWorkloadStatus.Preempted:
      return {
        label: 'Preempted',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.Evicted:
      return {
        label: 'Evicted',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.Requeued:
      return {
        label: 'Requeued',
        color: 'grey',
        IconComponent: OutlinedClockIcon,
      };
    case KueueWorkloadStatus.Inadmissible:
      return {
        label: 'Inadmissible',
        status: 'warning',
        IconComponent: ExclamationTriangleIcon,
      };
    case KueueWorkloadStatus.AdmissionCheck:
      return {
        label: 'Admission check',
        color: 'blue',
        IconComponent: InProgressIcon,
        iconClassName: 'ai-u-spin',
      };
    case KueueWorkloadStatus.BlockedOnPreemptionGates:
      return {
        label: 'Blocked on preemption',
        color: 'blue',
        IconComponent: InProgressIcon,
        iconClassName: 'ai-u-spin',
      };
    case KueueWorkloadStatus.Running:
      return { label: 'Running', color: 'blue', IconComponent: InProgressIcon };
    case KueueWorkloadStatus.Admitted:
      return {
        label: 'Starting',
        color: 'blue',
        IconComponent: InProgressIcon,
        iconClassName: 'ai-u-spin',
      };
    case KueueWorkloadStatus.Complete:
      return {
        label: 'Complete',
        status: 'success',
        IconComponent: CheckCircleIcon,
      };
    default:
      return { label: status, color: 'grey', IconComponent: OutlinedClockIcon };
  }
};

/** Maps a Kueue status level (danger/warning/success) to a generic condition status. */
export const getKueueConditionStatus = (status: KueueWorkloadStatus): GenericConditionStatus => {
  const level = getKueueStatusInfo(status).status;
  if (level === 'danger') return 'False';
  if (level === 'warning') return 'Warning';
  if (level === 'success') return 'True';
  return 'Unknown';
};

export const getKueueSchedulingSubStep = (
  kueueStatus: KueueWorkloadStatusWithMessage | null | undefined,
): {
  type: string;
  label: string;
  messageStatus: GenericConditionStatus;
  lastTransitionTime?: string;
} | null => {
  if (!kueueStatus) return null;
  return {
    type: 'kueue',
    label: getDeploymentKueueSubStepMessage(kueueStatus),
    messageStatus: getKueueConditionStatus(kueueStatus.status),
    lastTransitionTime: kueueStatus.timestamp,
  };
};
