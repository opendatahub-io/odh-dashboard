import axios from 'axios';
import { AcceleratorInfo } from '~/types';

export const getAcceleratorCounts = (): Promise<AcceleratorInfo> => {
  const url = '/api/accelerators';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
