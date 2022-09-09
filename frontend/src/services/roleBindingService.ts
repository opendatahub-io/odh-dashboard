import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RoleBinding } from '../types';
import { RoleBindingModel } from '../models';

export const getRoleBinding = (projectName: string, rbName: string): Promise<RoleBinding> => {
  return k8sGetResource({
    model: RoleBindingModel,
    queryOptions: { name: rbName, ns: projectName },
  });
};

export const createRoleBinding = (data: RoleBinding): Promise<RoleBinding> => {
  return k8sCreateResource({ model: RoleBindingModel, resource: data });
};
