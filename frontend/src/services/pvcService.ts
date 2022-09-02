import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PVCModel } from '../models';
import { PersistentVolumeClaim } from '../types';

export const getPvc = (projectName: string, pvcName: string): Promise<PersistentVolumeClaim> => {
  return k8sGetResource<PersistentVolumeClaim>({
    model: PVCModel,
    queryOptions: { name: pvcName, ns: projectName },
  });
};

export const createPvc = (data: PersistentVolumeClaim): Promise<PersistentVolumeClaim> => {
  return k8sCreateResource<PersistentVolumeClaim>({ model: PVCModel, resource: data });
};
