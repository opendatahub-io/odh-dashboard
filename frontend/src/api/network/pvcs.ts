import {
  k8sCreateResource,
  k8sGetResource,
  k8sListResourceItems,
} from '@openshift/dynamic-plugin-sdk-utils';
import { PersistentVolumeClaimKind } from '../../k8sTypes';
import { genRandomChars } from '../../utilities/string';
import { PVCModel } from '../models';

export const assemblePvc = (
  pvcName: string,
  projectName: string,
  description: string,
  pvcSize: number,
): PersistentVolumeClaimKind => ({
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  metadata: {
    name: `pvc-${genRandomChars()}`,
    namespace: projectName,
    annotations: {
      'openshift.io/display-name': pvcName,
      'openshift.io/description': description,
    },
  },
  spec: {
    accessModes: ['ReadWriteOnce'],
    resources: {
      requests: {
        storage: `${pvcSize}Gi`,
      },
    },
    volumeMode: 'Filesystem',
  },
  status: {
    phase: 'Pending',
  },
});

export const getPvc = (
  projectName: string,
  pvcName: string,
): Promise<PersistentVolumeClaimKind> => {
  return k8sGetResource<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: projectName },
  });
};

export const createPvc = (data: PersistentVolumeClaimKind): Promise<PersistentVolumeClaimKind> => {
  return k8sCreateResource<PersistentVolumeClaimKind>({ model: PVCModel, resource: data });
};

export const getPvcs = (projectName: string): Promise<PersistentVolumeClaimKind[]> => {
  return k8sListResourceItems<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: { ns: projectName },
  });
};

export const getAvailablePvcs = (projectName: string): Promise<PersistentVolumeClaimKind[]> => {
  return getPvcs(projectName).then((pvcs) =>
    pvcs.filter((pvc) => {
      const accessModes = pvc.spec.accessModes;
      return accessModes.includes('ReadOnlyMany') || accessModes.includes('ReadWriteMany');
    }),
  );
};
