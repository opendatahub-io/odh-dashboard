import axios from 'axios';
import { ConfigMap, Secret } from 'types';

export const getEnvSecret = (namespace: string, name: string): Promise<Secret> => {
  const url = `/api/envs/secret/${namespace}/${name}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};

export const getEnvConfigMap = (namespace: string, name: string): Promise<ConfigMap> => {
  const url = `/api/envs/configmap/${namespace}/${name}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};
