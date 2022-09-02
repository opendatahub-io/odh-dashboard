import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapModel } from '../models';
import { ConfigMap, DeleteStatus } from '../types';

export const getConfigMap = (projectName: string, configMapName: string): Promise<ConfigMap> => {
  return k8sGetResource<ConfigMap>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName, ns: projectName },
  });
};

export const createConfigMap = (data: ConfigMap): Promise<ConfigMap> => {
  return k8sCreateResource<ConfigMap>({ model: ConfigMapModel, resource: data });
};

export const replaceConfigMap = (data: ConfigMap): Promise<ConfigMap> => {
  return k8sUpdateResource<ConfigMap>({ model: ConfigMapModel, resource: data });
};

export const deleteConfigMap = (
  projectName: string,
  configMapName: string,
): Promise<DeleteStatus> => {
  return k8sDeleteResource<ConfigMap, DeleteStatus>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName },
  });
};
