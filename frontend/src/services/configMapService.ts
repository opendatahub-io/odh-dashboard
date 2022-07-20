import axios from 'axios';
import { ConfigMap } from '../types';

export const getConfigMap = (name: string): Promise<ConfigMap> => {
  const url = `/api/configmaps/${name}`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createConfigMap = (data: ConfigMap): Promise<ConfigMap> => {
  const url = `/api/configmaps`;
  return axios
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const replaceConfigMap = (configMapName: string, data: ConfigMap): Promise<ConfigMap> => {
  const url = `/api/configmaps/${configMapName}`;
  return axios
    .put(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
