import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapKind, K8sStatus } from '../../k8sTypes';
import { ConfigMapModel } from '../models';

export const getConfigMap = (
  projectName: string,
  configMapName: string,
): Promise<ConfigMapKind> => {
  return k8sGetResource<ConfigMapKind>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName, ns: projectName },
  });
};

export const createConfigMap = (data: ConfigMapKind): Promise<ConfigMapKind> => {
  return k8sCreateResource<ConfigMapKind>({ model: ConfigMapModel, resource: data });
};

export const replaceConfigMap = (data: ConfigMapKind): Promise<ConfigMapKind> => {
  return k8sUpdateResource<ConfigMapKind>({ model: ConfigMapModel, resource: data });
};

export const deleteConfigMap = (projectName: string, configMapName: string): Promise<K8sStatus> => {
  return k8sDeleteResource<ConfigMapKind, K8sStatus>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName },
  });
};
