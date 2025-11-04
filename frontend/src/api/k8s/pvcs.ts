import * as _ from 'lodash-es';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, KnownLabels, PersistentVolumeClaimKind } from '#~/k8sTypes';
import { PVCModel } from '#~/api/models';
import { translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '#~/const';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { StorageData } from '#~/pages/projects/types';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { PvcModelAnnotation } from '#~/pages/projects/screens/spawner/storage/types';

export const assemblePvc = (
  data: StorageData,
  namespace: string,
  editName?: string,
  hideFromUI?: boolean,
  additionalAnnotations?: Record<string, string>, // Generic alternative to forceRedeploy
  additionalLabels?: Record<string, string>, // Additional custom labels
): PersistentVolumeClaimKind => {
  const {
    name: pvcName,
    description,
    size,
    storageClassName,
    accessMode,
    modelName,
    modelPath,
  } = data;
  const name = editName || data.k8sName || translateDisplayNameForK8s(pvcName);

  const annotations: Record<string, string> = {
    'openshift.io/display-name': pvcName.trim(),
    ...(description && { 'openshift.io/description': description }),
    ...(modelName && { [PvcModelAnnotation.MODEL_NAME]: modelName }),
    ...(modelPath && { [PvcModelAnnotation.MODEL_PATH]: modelPath }),
    ...(additionalAnnotations || {}),
  };

  return {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name,
      namespace,
      ...((hideFromUI !== true || additionalLabels) && {
        labels: {
          // Add dashboard-resource label only if not hidden from UI
          ...(hideFromUI !== true && {
            [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          }),
          // Always add custom labels if provided (regardless of hideFromUI)
          ...(additionalLabels || {}),
        },
      }),
      annotations,
    },
    spec: {
      accessModes: [accessMode ?? AccessMode.RWO],
      resources: {
        requests: {
          storage: String(size),
        },
      },
      storageClassName,
      volumeMode: 'Filesystem',
    },
    status: {
      phase: 'Pending',
    },
  };
};

export const getDashboardPvcs = (projectName: string): Promise<PersistentVolumeClaimKind[]> =>
  k8sListResourceItems<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: {
      ns: projectName,
      queryParams: { labelSelector: LABEL_SELECTOR_DASHBOARD_RESOURCE },
    },
  });

export const createPvc = (
  data: StorageData,
  namespace: string,
  opts?: K8sAPIOptions,
  hideFromUI?: boolean,
  additionalAnnotations?: Record<string, string>,
  additionalLabels?: Record<string, string>,
): Promise<PersistentVolumeClaimKind> => {
  const pvc = assemblePvc(
    data,
    namespace,
    undefined,
    hideFromUI,
    additionalAnnotations,
    additionalLabels,
  );

  return k8sCreateResource<PersistentVolumeClaimKind>(
    applyK8sAPIOptions({ model: PVCModel, resource: pvc }, opts),
  );
};

export const updatePvc = (
  data: StorageData,
  existingData: PersistentVolumeClaimKind,
  namespace: string,
  opts?: K8sAPIOptions,
  excludeSpec?: boolean,
  additionalAnnotations?: Record<string, string>,
): Promise<PersistentVolumeClaimKind> => {
  const pvc = assemblePvc(
    data,
    namespace,
    existingData.metadata.name,
    undefined,
    additionalAnnotations,
  );

  const newData = excludeSpec
    ? {
        ...pvc,
        spec: {
          resources: {
            requests: {
              storage: pvc.spec.resources.requests.storage,
            },
          },
        },
      }
    : pvc;

  const pvcResource = _.merge({}, existingData, newData);
  if (!data.description && pvcResource.metadata.annotations?.['openshift.io/description']) {
    pvcResource.metadata.annotations['openshift.io/description'] = undefined;
  }

  if (pvcResource.metadata.annotations) {
    if (!data.modelName) {
      delete pvcResource.metadata.annotations[PvcModelAnnotation.MODEL_NAME];
    }
    if (!data.modelPath) {
      delete pvcResource.metadata.annotations[PvcModelAnnotation.MODEL_PATH];
    }
  }
  return k8sUpdateResource<PersistentVolumeClaimKind>(
    applyK8sAPIOptions({ model: PVCModel, resource: pvcResource }, opts),
  );
};

export const deletePvc = (pvcName: string, namespace: string): Promise<K8sStatus> =>
  k8sDeleteResource<PersistentVolumeClaimKind, K8sStatus>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: namespace },
  });

export const getPvc = (
  projectName: string,
  pvcName: string,
  opts?: K8sAPIOptions,
): Promise<PersistentVolumeClaimKind> =>
  k8sGetResource<PersistentVolumeClaimKind>(
    applyK8sAPIOptions(
      {
        model: PVCModel,
        queryOptions: { name: pvcName, ns: projectName },
      },
      opts,
    ),
  );
