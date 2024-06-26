import axios from '~/utilities/axios';
import { ModelRegistryKind } from '~/k8sTypes';
import { RecursivePartial } from '~/typeHelpers';

const registriesUrl = '/api/modelRegistries';

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
