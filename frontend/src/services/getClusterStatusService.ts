import axios from 'axios';
import { DataScienceClusterKindStatus } from '~/k8sTypes';

export const fetchClusterStatus = (): Promise<DataScienceClusterKindStatus> => {
  const url = '/api/dsc/status';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
