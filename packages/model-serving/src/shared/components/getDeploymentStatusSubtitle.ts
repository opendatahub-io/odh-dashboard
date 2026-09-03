import {
  t_global_text_color_regular as RegularColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_color_status_warning_300 as WarningColor,
} from '@patternfly/react-tokens';
import { getKueueStatusInfo } from '@odh-dashboard/ui-core/kueue/statusInfo';
import {
  appendModelDeploymentPodAdmissionSuffix,
  getModelDeploymentKueueDetailMessage,
} from '@odh-dashboard/k8s-core/kueue/messageUtils';
import { KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT } from '@odh-dashboard/k8s-core/kueue/types';
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
    return appendModelDeploymentPodAdmissionSuffix(
      getModelDeploymentKueueDetailMessage(kueueStatus),
      kueueStatus,
    );
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
