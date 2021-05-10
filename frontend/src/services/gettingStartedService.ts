import axios from 'axios';
import { getBackendURL } from '../utilities/utils';
import { ODHGettingStarted } from '../types';

export const fetchGettingStartedDoc = (appName: string): Promise<ODHGettingStarted> => {
  const url = getBackendURL('/api/getting-started');
  const searchParams = new URLSearchParams();
  if (appName) {
    searchParams.set('appName', appName);
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const fetchGettingStartedDocs = (): Promise<ODHGettingStarted[]> => {
  const url = getBackendURL('/api/getting-started');
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data);
    });
};
