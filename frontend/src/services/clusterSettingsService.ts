import axios from 'axios';
import { ClusterSettings } from '../types';

export const fetchClusterSettings = (): Promise<ClusterSettings> => {
  const url = '/api/cluster-settings';
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateClusterSettings = (
  settings: ClusterSettings,
): Promise<{ success: boolean; error: string }> => {
  const url = '/api/cluster-settings';
  return axios
    .put(url, settings)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
