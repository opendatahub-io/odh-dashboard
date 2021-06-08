import axios from 'axios';
import { getBackendURL } from '../utilities/utils';
import { OdhGettingStarted } from '../types';

export const fetchGettingStartedDoc = (appName: string): Promise<OdhGettingStarted> => {
  const url = getBackendURL('/api/getting-started');
  const searchParams = new URLSearchParams();
  if (appName) {
    searchParams.set('appName', appName);
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((response) => {
      return response.data[0];
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const fetchGettingStartedDocs = (): Promise<OdhGettingStarted[]> => {
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
