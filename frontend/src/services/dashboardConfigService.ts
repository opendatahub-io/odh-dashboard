import axios from 'axios';
import { DashboardConfig } from '../types';

export const fetchDashboardConfig = (): Promise<DashboardConfig> => {
  const url = '/api/config';
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
