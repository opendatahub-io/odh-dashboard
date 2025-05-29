import axios from '#~/utilities/axios';
import { RoleBindingKind } from '#~/k8sTypes';

export const getRoleBinding = (projectName: string, rbName: string): Promise<RoleBindingKind> => {
  const url = `/api/rolebindings/${projectName}/${rbName}`;
  return axios.get(url).then((response) => response.data);
};

export const createRoleBinding = (data: RoleBindingKind): Promise<RoleBindingKind> => {
  const url = `/api/rolebindings`;
  return axios.post(url, data).then((response) => response.data);
};
