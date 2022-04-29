import axios from 'axios';
import { Secret, SecretList } from '../types';
import { ODH_MANAGED, ODH_TYPE } from '../utilities/const';

export const getSecrets = (namespace: string): Promise<SecretList> => {
  const url = `/api/kubernetes/api/v1/namespaces/${namespace}/secrets`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createSecret = (
  namespace: string,
  name: string,
  stringData: { [key: string]: string },
  odhType: string,
): Promise<Secret> => {
  const url = `/api/kubernetes/api/v1/namespaces/${namespace}/secrets`;
  const labels = { [ODH_MANAGED]: 'true', [ODH_TYPE]: odhType };

  const postData: Secret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      labels,
    },
    type: 'Opaque',
    stringData,
  };

  return axios
    .post(url, postData)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteSecret = (namespace: string, name: string): Promise<any> => {
  const url = `/api/kubernetes/api/v1/namespaces/${namespace}/secrets/${name}`;

  return axios
    .delete(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
