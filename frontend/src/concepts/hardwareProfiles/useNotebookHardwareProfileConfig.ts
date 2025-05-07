import { HardwareProfileFeatureVisibility, NotebookKind } from '~/k8sTypes';
import { Notebook } from '~/types';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';

const useNotebookHardwareProfileConfig = (
  notebook?: NotebookKind | Notebook | null,
): UseHardwareProfileConfigResult => {
  const name = notebook?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const resources = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  )?.resources;
  const tolerations = notebook?.spec.template.spec.tolerations;
  const nodeSelector = notebook?.spec.template.spec.nodeSelector;
  const namespace = notebook?.metadata.namespace;
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const hardwareProfileNamespace =
    notebook?.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'];

  return useHardwareProfileConfig(
    name,
    resources,
    tolerations,
    nodeSelector,
    [HardwareProfileFeatureVisibility.WORKBENCH],
    isProjectScoped ? namespace : undefined,
    hardwareProfileNamespace,
  );
};

export default useNotebookHardwareProfileConfig;
