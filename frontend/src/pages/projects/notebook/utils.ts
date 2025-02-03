import { NotebookKind } from '~/k8sTypes';
import { NotebookSize } from '~/types';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';

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
  size: NotebookSize | null,
  acceleratorProfile: AcceleratorProfileState,
): void => {
  fireFormTrackingEvent(`Workbench ${action === 'started' ? 'Started' : 'Stopped'}`, {
    outcome: TrackingOutcome.submit,
    acceleratorCount: acceleratorProfile.unknownProfileDetected
      ? undefined
      : acceleratorProfile.count,
    accelerator: acceleratorProfile.acceleratorProfile
      ? `${acceleratorProfile.acceleratorProfile.spec.displayName} (${acceleratorProfile.acceleratorProfile.metadata.name}): ${acceleratorProfile.acceleratorProfile.spec.identifier}`
      : acceleratorProfile.unknownProfileDetected
      ? 'Unknown'
      : 'None',
    lastSelectedSize:
      size?.name || notebook.metadata.annotations?.['notebooks.opendatahub.io/last-size-selection'],
    lastSelectedImage:
      notebook.metadata.annotations?.['notebooks.opendatahub.io/last-image-selection'],
    projectName: notebook.metadata.namespace,
    notebookName: notebook.metadata.name,
    ...(action === 'stopped' && {
      lastActivity: notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'],
    }),
  });
};
