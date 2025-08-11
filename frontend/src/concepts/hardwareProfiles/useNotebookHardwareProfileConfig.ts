import * as React from 'react';
import { HardwareProfileFeatureVisibility, NotebookKind } from '#~/k8sTypes';
import { Notebook } from '#~/types';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';

const useNotebookHardwareProfileConfig = (
  notebook?: NotebookKind | Notebook | null,
): UseHardwareProfileConfigResult => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const legacyName =
    notebook?.metadata.annotations?.['opendatahub.io/legacy-hardware-profile-name'];
  const name =
    legacyName || notebook?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const resources = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  )?.resources;
  const tolerations = notebook?.spec.template.spec.tolerations;
  const nodeSelector = notebook?.spec.template.spec.nodeSelector;
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const hardwareProfileNamespace =
    notebook?.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'];

  // Use notebook namespace if available (editing), otherwise use current project (creating new)
  const namespace =
    notebook?.metadata.namespace || (isProjectScoped ? currentProject.metadata.name : undefined);

  return useHardwareProfileConfig(
    name,
    resources,
    tolerations,
    nodeSelector,
    [HardwareProfileFeatureVisibility.WORKBENCH],
    namespace,
    hardwareProfileNamespace,
  );
};

export default useNotebookHardwareProfileConfig;
