import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import axios from '~/utilities/axios';
import { ModelRegistryKind, RoleBindingKind } from '~/k8sTypes';
import { RecursivePartial } from '~/typeHelpers';

const registriesUrl = '/api/modelRegistries';
const mrRoleBindingsUrl = '/api/modelRegistryRoleBindings';

type ModelRegistryAndDBPassword = {
  modelRegistry: ModelRegistryKind;
  databasePassword?: string;
};

export const listModelRegistriesBackend = (labelSelector?: string): Promise<ModelRegistryKind[]> =>
  axios
    .get(registriesUrl, { params: { labelSelector } })
    .then((response) => response.data.items)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });

export const createModelRegistryBackend = (
  data: ModelRegistryAndDBPassword,
): Promise<ModelRegistryKind> =>
  axios
    .post(registriesUrl, data)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });

export const getModelRegistryBackend = (
  modelRegistryName: string,
): Promise<ModelRegistryAndDBPassword> =>
  axios
    .get(`${registriesUrl}/${modelRegistryName}`)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });

export const updateModelRegistryBackend = (
  modelRegistryName: string,
  patch: RecursivePartial<ModelRegistryKind>,
): Promise<ModelRegistryAndDBPassword> =>
  axios
    .patch(`${registriesUrl}/${modelRegistryName}`, patch)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });

export const deleteModelRegistryBackend = (modelRegistryName: string): Promise<ModelRegistryKind> =>
  axios
    .delete(`${registriesUrl}/${modelRegistryName}`)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });

export const listModelRegistryRoleBindings = (): Promise<RoleBindingKind[]> =>
  axios
    .get(mrRoleBindingsUrl)
    .then((response) => response.data.items)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });

export const createModelRegistryRoleBinding = (data: RoleBindingKind): Promise<RoleBindingKind> =>
  axios
    .post(mrRoleBindingsUrl, data)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });

export const deleteModelRegistryRoleBinding = (roleBindingName: string): Promise<K8sStatus> =>
  axios
    .delete(`${mrRoleBindingsUrl}/${roleBindingName}`)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
