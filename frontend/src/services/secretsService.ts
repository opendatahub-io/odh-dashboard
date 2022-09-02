import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { SecretModel } from '../models';
import { DeleteStatus, Secret } from '../types';

export const getSecret = (projectName: string, secretName: string): Promise<Secret> => {
  return k8sGetResource<Secret>({
    model: SecretModel,
    queryOptions: { name: secretName, ns: projectName },
  });
};

export const createSecret = (data: Secret): Promise<Secret> => {
  return k8sCreateResource<Secret>({ model: SecretModel, resource: data });
};

export const replaceSecret = (data: Secret): Promise<Secret> => {
  return k8sUpdateResource<Secret>({ model: SecretModel, resource: data });
};

export const deleteSecret = (projectName: string, secretName: string): Promise<DeleteStatus> => {
  return k8sDeleteResource<Secret, DeleteStatus>({
    model: SecretModel,
    queryOptions: { name: secretName, ns: projectName },
  });
};
