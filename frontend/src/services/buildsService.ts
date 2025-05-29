import axios from '#~/utilities/axios';
import { BuildStatus } from '#~/types';

export const fetchBuildStatuses = (): Promise<BuildStatus[]> => {
  const url = '/api/builds';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
