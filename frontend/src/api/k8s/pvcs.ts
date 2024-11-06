import * as _ from 'lodash-es';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, KnownLabels, PersistentVolumeClaimKind } from '~/k8sTypes';
import { PVCModel } from '~/api/models';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { CreatingStorageObject } from '~/pages/projects/types';

export const assemblePvc = (
  data: CreatingStorageObject,
  namespace: string,
  editName?: string,
  hideFromUI?: boolean,
): PersistentVolumeClaimKind => {
  const {
    nameDesc: { name: pvcName, description },
    size,
    storageClassName,
  } = data;

  const name = editName || translateDisplayNameForK8s(pvcName);

  return {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name,
      namespace,
      ...(hideFromUI !== true && {
        labels: {
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        },
      }),
      annotations: {
        'openshift.io/display-name': pvcName.trim(),
        'openshift.io/description': description,
      },
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: size,
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
  data: CreatingStorageObject,
  namespace: string,
  opts?: K8sAPIOptions,
  hideFromUI?: boolean,
): Promise<PersistentVolumeClaimKind> => {
  const pvc = assemblePvc(data, namespace, undefined, hideFromUI);

  return k8sCreateResource<PersistentVolumeClaimKind>(
    applyK8sAPIOptions({ model: PVCModel, resource: pvc }, opts),
  );
};

export const updatePvc = (
  data: CreatingStorageObject,
  existingData: PersistentVolumeClaimKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<PersistentVolumeClaimKind> => {
  const pvc = assemblePvc(data, namespace, existingData.metadata.name);

  return k8sUpdateResource<PersistentVolumeClaimKind>(
    applyK8sAPIOptions({ model: PVCModel, resource: _.merge({}, existingData, pvc) }, opts),
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
