import axios from 'axios';
import { Secret, SecretList } from '../types';
import { ODH_MANAGED, ODH_TYPE } from '../utilities/const';

export const getSecrets = (namespace: string, odhType?: string): Promise<SecretList> => {
  const url = `/api/kubernetes/api/v1/namespaces/${namespace}/secrets`;
  const params = new URLSearchParams();
  const labels = [`${ODH_MANAGED}=true`, `${ODH_TYPE}=${odhType}`];
  params.set('labels', labels.join(','));
  const options = { params };
  return axios
    .get(url, options)
    .then((response) => {
      //TODO fix broken query by label instead of filtering
      const responseData = response.data;
      if (odhType) {
        responseData.items = responseData.items.filter((secret) => {
          return secret?.metadata?.labels?.[ODH_TYPE] === odhType;
        });
      }
      return responseData;
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
