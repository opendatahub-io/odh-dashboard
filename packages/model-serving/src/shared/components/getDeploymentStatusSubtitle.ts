import {
  t_global_text_color_regular as RegularColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_color_status_warning_300 as WarningColor,
} from '@patternfly/react-tokens';
import { getKueueStatusInfo } from '@odh-dashboard/internal/concepts/kueue/index';
import {
  formatPodAdmissionCounts,
  getHumanReadableKueueMessage,
  getRequeuedMessage,
} from '@odh-dashboard/internal/concepts/kueue/messageUtils';
import {
  KueueWorkloadStatus,
  KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT,
} from '@odh-dashboard/internal/concepts/kueue/types';
import { ModelDeploymentState } from '../types';
import type { DeploymentStatus } from '../../../extension-points';

/**
 * Subtitle text shown next to the deployment status label (mirrors the workbench status
 * subtitle): the human-readable Kueue scheduling message when one is "interesting"
 * (queued/failed/etc.), otherwise the deployment's own failure message.
 */
export const getDeploymentStatusSubtitle = (status?: DeploymentStatus | null): string | null => {
  if (!status) {
    return null;
  }
  const { kueueStatus, message, state } = status;

  if (
    kueueStatus?.status &&
    KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT.includes(kueueStatus.status)
  ) {
    if (kueueStatus.status === KueueWorkloadStatus.Requeued) {
      return getRequeuedMessage(kueueStatus);
    }
    const humanMessage = getHumanReadableKueueMessage(
      kueueStatus.status,
      kueueStatus.message,
      kueueStatus.queueName,
    );

    // Queue position isn't included here yet — queuePosition/queueTotal aren't populated for
    // model deployments (only workbenches, via useQueuePositions). Tracked as a follow-up PR.
    const suffixes: string[] = [];
    if (kueueStatus.podAdmissionCounts && kueueStatus.podAdmissionCounts.total > 1) {
      suffixes.push(
        formatPodAdmissionCounts(
          kueueStatus.podAdmissionCounts.admitted,
          kueueStatus.podAdmissionCounts.total,
        ),
      );
    }

    return suffixes.length > 0 ? `${humanMessage} (${suffixes.join(', ')})` : humanMessage;
  }

  if (state === ModelDeploymentState.FAILED_TO_LOAD && message) {
    return message;
  }

  return null;
};

/** Text color for the status subtitle, matching the severity of what it's reporting. */
export const getDeploymentStatusSubtitleColor = (status?: DeploymentStatus | null): string => {
  if (
    status?.kueueStatus?.status &&
    KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT.includes(status.kueueStatus.status)
  ) {
    const level = getKueueStatusInfo(status.kueueStatus.status).status;
    if (level === 'danger') return DangerColor.var;
    if (level === 'warning') return WarningColor.var;
  }
  if (status?.state === ModelDeploymentState.FAILED_TO_LOAD) {
    return DangerColor.var;
  }
  return RegularColor.var;
};
