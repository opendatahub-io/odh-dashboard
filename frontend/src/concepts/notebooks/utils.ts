import React from 'react';
import { HardwareProfileFeatureVisibility, NotebookKind } from '#~/k8sTypes.ts';
import { Notebook } from '#~/types';
import {
  useAssignHardwareProfile,
  UseAssignHardwareProfileResult,
} from '#~/concepts/hardwareProfiles/useAssignHardwareProfile.ts';
import { NOTEBOOK_HARDWARE_PROFILE_PATHS } from '#~/concepts/notebooks/const.ts';

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
