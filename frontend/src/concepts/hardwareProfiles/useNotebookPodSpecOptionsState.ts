import { useNotebookSizeState } from '#~/pages/projects/screens/spawner/useNotebookSizeState';
import { NotebookKind } from '#~/k8sTypes';
import useNotebookAcceleratorProfileFormState from '#~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfileFormState';
import { Notebook, NotebookSize } from '#~/types';
import { usePreferredNotebookSize } from '#~/pages/notebookController/screens/server/usePreferredNotebookSize';
import useNotebookHardwareProfileConfig from './useNotebookHardwareProfileConfig';
import { PodSpecOptions, PodSpecOptionsState } from './types';

export type NotebookPodSpecOptions = PodSpecOptions & {
  lastSizeSelection?: string;
};

export type NotebookPodSpecOptionsState = PodSpecOptionsState<NotebookPodSpecOptions> & {
  notebooksSize: ReturnType<typeof useNotebookSizeState>;
};

export const useNotebookKindPodSpecOptionsState = (
  existingNotebook?: NotebookKind,
): NotebookPodSpecOptionsState => {
  const notebookKindSizeState = useNotebookSizeState(existingNotebook);
  return useNotebookPodSpecOptionsStateBase(notebookKindSizeState, existingNotebook);
};

export const useNotebookPodSpecOptionsState = (
  existingNotebook?: Notebook,
): NotebookPodSpecOptionsState => {
  const preferredNotebookSize = usePreferredNotebookSize();
  return useNotebookPodSpecOptionsStateBase(preferredNotebookSize, existingNotebook);
};

const useNotebookPodSpecOptionsStateBase = (
  notebookSizeState: {
    selectedSize: NotebookSize;
    setSelectedSize: (size: string) => void;
    sizes: NotebookSize[];
  },
  existingNotebook?: Notebook | NotebookKind,
): NotebookPodSpecOptionsState => {
  const acceleratorProfileFormState = useNotebookAcceleratorProfileFormState(existingNotebook);

  // hardware profile state
  const hardwareProfileConfig = useNotebookHardwareProfileConfig(existingNotebook);

  let podSpecOptions: NotebookPodSpecOptions = {
    resources: {},
  };

  // fetch existing pod spec options from existing notebook
  const existingTolerations = existingNotebook?.spec.template.spec.tolerations;
  const existingResources = existingNotebook?.spec.template.spec.containers[0].resources;
  const existingNodeSelector = existingNotebook?.spec.template.spec.nodeSelector;

  // create new pod spec options from form data

  const annotationData = {
    selectedHardwareProfile: hardwareProfileConfig.formData.selectedProfile,
  };
  if (hardwareProfileConfig.formData.useExistingSettings) {
    // if using existing settings, use existing pod spec options
    podSpecOptions = {
      resources: existingResources,
      tolerations: existingTolerations,
      nodeSelector: existingNodeSelector,
      ...annotationData,
    };
  } else {
    podSpecOptions = {
      resources: hardwareProfileConfig.formData.resources,
      tolerations:
        hardwareProfileConfig.formData.selectedProfile?.spec.scheduling?.node?.tolerations,
      nodeSelector:
        hardwareProfileConfig.formData.selectedProfile?.spec.scheduling?.node?.nodeSelector,
      ...annotationData,
    };
  }

  return {
    notebooksSize: notebookSizeState,
    acceleratorProfile: acceleratorProfileFormState,
    hardwareProfile: hardwareProfileConfig,
    podSpecOptions,
  };
};
