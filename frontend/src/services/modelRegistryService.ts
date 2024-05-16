import axios from 'axios';
import { ModelRegistryKind } from '~/k8sTypes';
import { RecursivePartial } from '~/typeHelpers';

export const listModelRegistriesBackend = (
  labelSelector?: string,
): Promise<ModelRegistryKind[]> => {
  const url = '/api/modelRegistries';
  return axios
    .get(url, { params: { labelSelector } })
    .then((response) => response.data.items)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createModelRegistryBackend = (data: ModelRegistryKind): Promise<ModelRegistryKind> => {
  const url = '/api/modelRegistries';
  return axios
    .post(url, data)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const getModelRegistryBackend = (modelRegistryName: string): Promise<ModelRegistryKind> => {
  const url = `/api/modelRegistries/${modelRegistryName}`;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateModelRegistryBackend = (
  modelRegistryName: string,
  patch: RecursivePartial<ModelRegistryKind>,
): Promise<ModelRegistryKind> => {
  const url = `/api/modelRegistries/${modelRegistryName}`;
  return axios
    .patch(url, patch)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteModelRegistryBackend = (
  modelRegistryName: string,
): Promise<ModelRegistryKind> => {
  const url = `/api/modelRegistries/${modelRegistryName}`;
  return axios
    .delete(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
