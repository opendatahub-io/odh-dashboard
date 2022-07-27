import axios from 'axios';
import { DeleteStatus, Secret } from '../types';

export const getSecret = (secretName: string): Promise<Secret> => {
  const url = `/api/secrets/${secretName}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};

export const createSecret = (data: Secret): Promise<Secret> => {
  const url = `/api/secrets`;
  return axios.post(url, data).then((response) => {
    return response.data;
  });
};

export const replaceSecret = (secretName: string, data: Secret): Promise<Secret> => {
  const url = `/api/secrets/${secretName}`;
  return axios.put(url, data).then((response) => {
    return response.data;
  });
};

export const deleteSecret = (secretName: string): Promise<DeleteStatus> => {
  const url = `/api/secrets/${secretName}`;
  return axios.delete(url).then((response) => {
    return response.data;
  });
};
