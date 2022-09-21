import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PersistentVolumeClaimKind } from '../../k8sTypes';
import { PVCModel } from '../models';

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
