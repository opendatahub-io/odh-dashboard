import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sPatchResource,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sStatus, PersistentVolumeClaimKind } from '../../k8sTypes';
import { genRandomChars } from '../../utilities/string';
import { PVCModel } from '../models';

export const assemblePvc = (
  pvcName: string,
  projectName: string,
  description: string,
  pvcSize: number,
): PersistentVolumeClaimKind => {
  const annotations = {
    'openshift.io/display-name': pvcName,
    'openshift.io/description': description,
  };

  return {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name: `pvc-${genRandomChars()}`,
      namespace: projectName,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
      annotations,
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
  };
};

export const getPvc = (
  projectName: string,
  pvcName: string,
): Promise<PersistentVolumeClaimKind> => {
  return k8sGetResource<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: projectName },
  });
};

export const getPvcs = (projectName: string): Promise<PersistentVolumeClaimKind[]> => {
  return k8sListResourceItems<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: { ns: projectName },
  });
};

export const getAvailableMultiUsePvcs = (
  projectName: string,
): Promise<PersistentVolumeClaimKind[]> => {
  return getPvcs(projectName).then((pvcs) =>
    pvcs.filter((pvc) => {
      const accessModes = pvc.spec.accessModes;
      return accessModes.includes('ReadOnlyMany') || accessModes.includes('ReadWriteMany');
    }),
  );
};

export const createPvc = (data: PersistentVolumeClaimKind): Promise<PersistentVolumeClaimKind> => {
  return k8sCreateResource<PersistentVolumeClaimKind>({ model: PVCModel, resource: data });
};

export const updatePvcDisplayName = (
  pvcName: string,
  namespace: string,
  displayName: string,
): Promise<PersistentVolumeClaimKind> => {
  return k8sPatchResource({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: namespace },
    patches: [
      {
        op: 'replace',
        path: '/metadata/annotations/openshift.io~1display-name',
        value: displayName,
      },
    ],
  });
};

export const updatePvcDescription = (
  pvcName: string,
  namespace: string,
  description: string,
): Promise<PersistentVolumeClaimKind> => {
  return k8sPatchResource({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: namespace },
    patches: [
      {
        op: 'replace',
        path: '/metadata/annotations/openshift.io~1description',
        value: description,
      },
    ],
  });
};

export const patchPVCForNotebook = (
  pvcName: string,
  namespace: string,
  relatedNotebookName: string,
): Promise<PersistentVolumeClaimKind> => {
  const patches: Patch[] = [
    {
      op: 'add',
      // TODO: document / utility ~1
      path: '/metadata/annotations/opendatahub.io~1related-notebooks',
      value: JSON.stringify([relatedNotebookName]),
    },
  ];

  return k8sPatchResource<PersistentVolumeClaimKind>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: namespace },
    patches,
  });
};

export const deletePvc = (pvcName: string, namespace: string): Promise<K8sStatus> => {
  return k8sDeleteResource<PersistentVolumeClaimKind, K8sStatus>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: namespace },
  });
};
