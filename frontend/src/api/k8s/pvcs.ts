import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sStatus, KnownLabels, PersistentVolumeClaimKind } from '~/k8sTypes';
import { PVCModel } from '~/api/models';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

export const assemblePvc = (
  pvcName: string,
  projectName: string,
  description: string,
  pvcSize: number,
): PersistentVolumeClaimKind => ({
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  metadata: {
    name: translateDisplayNameForK8s(pvcName),
    namespace: projectName,
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
        storage: `${pvcSize}Gi`,
      },
    },
    volumeMode: 'Filesystem',
  },
  status: {
    phase: 'Pending',
  },
});

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

export const createPvc = (data: PersistentVolumeClaimKind): Promise<PersistentVolumeClaimKind> =>
  k8sCreateResource<PersistentVolumeClaimKind>({ model: PVCModel, resource: data });

export const updatePvcDisplayName = (
  pvcName: string,
  namespace: string,
  displayName: string,
): Promise<PersistentVolumeClaimKind> =>
  k8sPatchResource({
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

export const updatePvcDescription = (
  pvcName: string,
  namespace: string,
  description: string,
): Promise<PersistentVolumeClaimKind> =>
  k8sPatchResource({
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

export const deletePvc = (pvcName: string, namespace: string): Promise<K8sStatus> =>
  k8sDeleteResource<PersistentVolumeClaimKind, K8sStatus>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: namespace },
  });

export const updatePvcSize = (
  pvcName: string,
  namespace: string,
  size: string,
): Promise<PersistentVolumeClaimKind> =>
  k8sPatchResource({
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
  });
