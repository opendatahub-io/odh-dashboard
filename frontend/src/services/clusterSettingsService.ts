import { ClusterSettingsType } from '#~/types';
import axios from '#~/utilities/axios';

export const fetchClusterSettings = (): Promise<ClusterSettingsType> => {
  const url = '/api/cluster-settings';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateClusterSettings = (
  settings: ClusterSettingsType,
): Promise<{ success: boolean; error: string }> => {
  const url = '/api/cluster-settings';
  return axios
    .put(url, settings)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
