import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sPatchResource,
  k8sUpdateResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, KnownLabels, PersistentVolumeClaimKind } from '~/k8sTypes';
import { PVCModel } from '~/api/models';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { CreatingStorageObject } from '~/pages/projects/types';

export const assemblePvc = (
  data: CreatingStorageObject,
  namespace: string,
  editName?: string,
): PersistentVolumeClaimKind => {
  const {
    nameDesc: { name: pvcName, description },
    size,
  } = data;

  const name = editName || translateDisplayNameForK8s(pvcName);

  return {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name,
      namespace,
      labels: {
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      },
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
      volumeMode: 'Filesystem',
    },
    status: {
      phase: 'Pending',
    },
  };
};

export const getPvc = (projectName: string, pvcName: string): Promise<PersistentVolumeClaimKind> =>
  k8sGetResource<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: projectName },
  });

export const getDashboardPvcs = (projectName: string): Promise<PersistentVolumeClaimKind[]> =>
  k8sListResourceItems<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: {
      ns: projectName,
      queryParams: { labelSelector: LABEL_SELECTOR_DASHBOARD_RESOURCE },
    },
  });

export const getAvailableMultiUsePvcs = (
  projectName: string,
): Promise<PersistentVolumeClaimKind[]> =>
  getDashboardPvcs(projectName).then((pvcs) =>
    pvcs.filter((pvc) => {
      const accessModes = pvc.spec.accessModes;
      return accessModes.includes('ReadOnlyMany') || accessModes.includes('ReadWriteMany');
    }),
  );

export const createPvc = (
  data: CreatingStorageObject,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<PersistentVolumeClaimKind> => {
  const pvc = assemblePvc(data, namespace);

  return k8sCreateResource<PersistentVolumeClaimKind>(
    applyK8sAPIOptions(opts, { model: PVCModel, resource: pvc }),
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
    applyK8sAPIOptions(opts, { model: PVCModel, resource: _.merge({}, existingData, pvc) }),
  );
};

export const deletePvc = (pvcName: string, namespace: string): Promise<K8sStatus> =>
  k8sDeleteResource<PersistentVolumeClaimKind, K8sStatus>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: namespace },
  });

export const updatePvcSize = (
  pvcName: string,
  namespace: string,
  size: string,
  opts?: K8sAPIOptions,
): Promise<PersistentVolumeClaimKind> =>
  k8sPatchResource(
    applyK8sAPIOptions(opts, {
      model: PVCModel,
      queryOptions: { name: pvcName, ns: namespace },
      patches: [
        {
          op: 'replace',
          path: '/spec/resources/requests',
          value: {
            storage: size,
          },
        },
      ],
    }),
  );
