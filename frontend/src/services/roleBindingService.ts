import axios from 'axios';
import { RoleBinding } from '~/types';

export const getRoleBinding = (projectName: string, rbName: string): Promise<RoleBinding> => {
  const url = `/api/rolebindings/${projectName}/${rbName}`;
  return axios.get(url).then((response) => response.data);
};

export const createRoleBinding = (data: RoleBinding): Promise<RoleBinding> => {
  const url = `/api/rolebindings`;
  return axios.post(url, data).then((response) => response.data);
};
