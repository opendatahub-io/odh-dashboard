import { NotebookKind } from '~/k8sTypes';
import { Notebook } from '~/types';
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

  return useHardwareProfileConfig(name, resources, tolerations, nodeSelector);
};

export default useNotebookHardwareProfileConfig;
