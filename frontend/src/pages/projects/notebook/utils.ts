import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { NotebookKind } from '#~/k8sTypes';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import {
  getWorkbenchKueueTrackingProperties,
  WorkbenchTrackingEvent,
  type WorkbenchKueueTrackingInput,
} from '#~/concepts/kueue/workbenchTracking';
import {
  HardwarePodSpecOptionsState,
  HardwarePodSpecOptions,
} from '#~/concepts/hardwareProfiles/types.ts';

export type {
  WorkbenchKueueTrackingInput,
  WorkbenchKueueTrackingProperties,
} from '#~/concepts/kueue/workbenchTracking';
export { getWorkbenchKueueTrackingProperties } from '#~/concepts/kueue/workbenchTracking';

export const hasStopAnnotation = (notebook: NotebookKind): boolean =>
  !!(
    notebook.metadata.annotations?.['kubeflow-resource-stopped'] &&
    notebook.metadata.annotations['kubeflow-resource-stopped'] !== 'odh-notebook-controller-lock'
  );

export const getNotebookPVCVolumeNames = (notebook: NotebookKind): { [name: string]: string } =>
  (notebook.spec.template.spec.volumes || []).reduce((acc, volume) => {
    if (!volume.persistentVolumeClaim?.claimName) {
      return acc;
    }

    return {
      ...acc,
      [volume.name]: volume.persistentVolumeClaim.claimName,
    };
  }, {});

export const getNotebookPVCMountPathMap = (
  notebook?: NotebookKind,
): { [claimName: string]: string } => {
  if (!notebook) {
    return {};
  }

  const pvcVolumeNames = getNotebookPVCVolumeNames(notebook);

  return notebook.spec.template.spec.containers.reduce(
    (acc, container) => ({
      ...acc,
      ...(container.volumeMounts || []).reduce((innerAcc, volumeMount) => {
        const claimName = pvcVolumeNames[volumeMount.name];
        if (!claimName) {
          return innerAcc;
        }

        return { ...innerAcc, [claimName]: volumeMount.mountPath || '/ ' };
      }, {}),
    }),
    {},
  );
};

export const fireNotebookTrackingEvent = (
  action: 'started' | 'stopped',
  notebook: NotebookKind,
  podSpecOptionsState: HardwarePodSpecOptionsState<HardwarePodSpecOptions>,
  kueueTrackingInput?: WorkbenchKueueTrackingInput,
): void => {
  fireFormTrackingEvent(
    action === 'started' ? WorkbenchTrackingEvent.Started : WorkbenchTrackingEvent.Stopped,
    {
      outcome: TrackingOutcome.submit,
      podSpecOptions: JSON.stringify({
        hardwareProfile:
          podSpecOptionsState.hardwareProfile.formData.selectedProfile?.metadata.name,
        resources: podSpecOptionsState.podSpecOptions.resources,
        tolerations: podSpecOptionsState.podSpecOptions.tolerations,
        nodeSelector: podSpecOptionsState.podSpecOptions.nodeSelector,
      }),
      lastSelectedImage:
        notebook.metadata.annotations?.['notebooks.opendatahub.io/last-image-selection'],
      projectName: notebook.metadata.namespace,
      notebookName: notebook.metadata.name,
      ...(action === 'stopped' && {
        lastActivity: notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'],
      }),
      ...(kueueTrackingInput && getWorkbenchKueueTrackingProperties(kueueTrackingInput)),
    },
  );
};
