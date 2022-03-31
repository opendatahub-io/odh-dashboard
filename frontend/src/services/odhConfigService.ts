import axios from 'axios';
import { OdhConfig } from '../types';

export const getOdhConfig = (): Promise<OdhConfig> => {
  const url = '/api/odhconfig';
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
