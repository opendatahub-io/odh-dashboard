import axios from 'axios';
import { GPUInfo } from '~/types';

export const getGPU = (): Promise<GPUInfo> => {
  const url = '/api/gpu';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
