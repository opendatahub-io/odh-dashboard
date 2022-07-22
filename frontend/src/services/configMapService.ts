import axios from 'axios';
import { ConfigMap, DeleteStatus } from '../types';

export const getConfigMap = (configMapName: string): Promise<ConfigMap> => {
  const url = `/api/configmaps/${configMapName}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};

export const createConfigMap = (data: ConfigMap): Promise<ConfigMap> => {
  const url = `/api/configmaps`;
  return axios.post(url, data).then((response) => {
    return response.data;
  });
};

export const replaceConfigMap = (configMapName: string, data: ConfigMap): Promise<ConfigMap> => {
  const url = `/api/configmaps/${configMapName}`;
  return axios.put(url, data).then((response) => {
    return response.data;
  });
};

export const deleteConfigMap = (configMapName: string): Promise<DeleteStatus> => {
  const url = `/api/configmaps/${configMapName}`;
  return axios.delete(url).then((response) => {
    return response.data;
  });
};
