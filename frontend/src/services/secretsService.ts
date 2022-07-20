import axios from 'axios';
import { Secret } from '../types';

export const getSecret = (name: string): Promise<Secret> => {
  const url = `/api/secrets/${name}`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createSecret = (data: Secret): Promise<Secret> => {
  const url = `/api/secrets`;
  return axios
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const replaceSecret = (secretName: string, data: Secret): Promise<Secret> => {
  const url = `/api/secrets/${secretName}`;
  return axios
    .put(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
