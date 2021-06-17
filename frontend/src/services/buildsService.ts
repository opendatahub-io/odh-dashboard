import axios from 'axios';
import { getBackendURL } from '../utilities/utils';
import { BuildStatus } from '../types';

export const fetchBuildStatuses = (): Promise<BuildStatus[]> => {
  const url = getBackendURL('/api/builds');
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
