import type { ComponentType, SVGProps } from 'react';
import React from 'react';
import { InProgressIcon } from '@patternfly/react-icons';
import { t_global_text_color_regular as RegularColor } from '@patternfly/react-tokens';
import { HardwareProfileFeatureVisibility, NotebookKind } from '#~/k8sTypes.ts';
import { EventStatus, Notebook, type NotebookStatus } from '#~/types';
import {
  useAssignHardwareProfile,
  UseAssignHardwareProfileResult,
} from '#~/concepts/hardwareProfiles/useAssignHardwareProfile.ts';
import { getKueueStatusInfo } from '#~/concepts/kueue';
import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import { NOTEBOOK_HARDWARE_PROFILE_PATHS } from '#~/concepts/notebooks/const.ts';

export type StatusLineIconResult = {
  IconComponent: ComponentType<SVGProps<SVGSVGElement>> | null;
  color: string;
  iconClassName?: string;
};

/**
 * In v3.0, the accessing of a Workbench will be assuming a shared gateway route with Dashboard.
 * Leveraging browser feature of "same-origin" on the use of slash (/) links.
 */
export const getRoutePathForWorkbench = (
  workbenchNamespace: string,
  workbenchName: string,
): string => `/notebook/${workbenchNamespace}/${workbenchName}`;

export const getNotebookResourcesPath = (
  notebook: NotebookKind | Notebook | null | undefined,
): string => {
  if (!notebook) return NOTEBOOK_HARDWARE_PROFILE_PATHS.containerResourcesPath;
  const containerIndex = notebook.spec.template.spec.containers.findIndex(
    (container) => container.name === notebook.metadata.name,
  );

  return `spec.template.spec.containers.${containerIndex >= 0 ? containerIndex : 0}.resources`;
};

export const useNotebookHardwareProfile = <T extends NotebookKind | Notebook>(
  notebook: T | null | undefined,
): UseAssignHardwareProfileResult<T> => {
  const paths = React.useMemo(
    () => ({
      ...NOTEBOOK_HARDWARE_PROFILE_PATHS,
      containerResourcesPath: getNotebookResourcesPath(notebook),
    }),
    [notebook],
  );

  return useAssignHardwareProfile(notebook, {
    visibleIn: [HardwareProfileFeatureVisibility.WORKBENCH],
    paths,
  });
};

export function getStatusLineIconAndColor(params: {
  notebookStatus?: NotebookStatus | null;
  kueueStatus?: KueueWorkloadStatusWithMessage | null;
  inProgress: boolean;
}): StatusLineIconResult {
  const { notebookStatus, kueueStatus, inProgress } = params;
  const eventStatus = notebookStatus?.currentStatus;

  if (kueueStatus?.status && eventStatus !== EventStatus.ERROR) {
    const info = getKueueStatusInfo(kueueStatus.status);
    return {
      IconComponent: info.IconComponent,
      color: info.contentColor ?? RegularColor.var,
      iconClassName: info.iconClassName,
    };
  }

  const resolvedEventStatus: KueueWorkloadStatus | null =
    eventStatus === EventStatus.ERROR
      ? KueueWorkloadStatus.Failed
      : eventStatus === EventStatus.WARNING
      ? KueueWorkloadStatus.Preempted
      : null;
  if (resolvedEventStatus) {
    const info = getKueueStatusInfo(resolvedEventStatus);
    return {
      IconComponent: info.IconComponent,
      color: info.contentColor ?? RegularColor.var,
      iconClassName: info.iconClassName,
    };
  }

  if (
    (!eventStatus || eventStatus === EventStatus.INFO || eventStatus === EventStatus.SUCCESS) &&
    inProgress
  ) {
    return {
      IconComponent: InProgressIcon,
      color: RegularColor.var,
      iconClassName: 'odh-u-spin',
    };
  }
  return { IconComponent: null, color: RegularColor.var };
}
