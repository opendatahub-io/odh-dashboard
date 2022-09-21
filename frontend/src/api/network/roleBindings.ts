import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RoleBindingKind } from '../../k8sTypes';
import { RoleBindingModel } from '../models';

export const getRoleBinding = (projectName: string, rbName: string): Promise<RoleBindingKind> => {
  return k8sGetResource({
    model: RoleBindingModel,
    queryOptions: { name: rbName, ns: projectName },
  });
};

export const createRoleBinding = (data: RoleBindingKind): Promise<RoleBindingKind> => {
  return k8sCreateResource({ model: RoleBindingModel, resource: data });
};
