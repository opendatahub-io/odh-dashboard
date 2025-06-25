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

export const assemblePvc = (
  data: StorageData,
  namespace: string,
  editName?: string,
  hideFromUI?: boolean,
  forceRedeploy?: boolean, // New optional parameter for NIM use case
): PersistentVolumeClaimKind => {
  const { name: pvcName, description, size, storageClassName, accessMode } = data;
  const name = editName || data.k8sName || translateDisplayNameForK8s(pvcName);

  const annotations: Record<string, string> = {
    'openshift.io/display-name': pvcName.trim(),
    ...(description && { 'openshift.io/description': description }),
  };

  // Only add the force redeploy annotation when explicitly requested (for NIM)
  if (forceRedeploy) {
    annotations['runtimes.opendatahub.io/force-redeploy'] = new Date().toISOString();
  }

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
  forceRedeploy?: boolean, // New optional parameter
): Promise<PersistentVolumeClaimKind> => {
  const pvc = assemblePvc(data, namespace, undefined, hideFromUI, forceRedeploy);

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
  forceRedeploy?: boolean, // New optional parameter
): Promise<PersistentVolumeClaimKind> => {
  const pvc = assemblePvc(data, namespace, existingData.metadata.name, undefined, forceRedeploy);
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
