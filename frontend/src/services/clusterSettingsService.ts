import axios from 'axios';
import { ClusterSettings } from '../types';
import { getBackendURL } from '../utilities/utils';

export const fetchClusterSettings = (): Promise<ClusterSettings> => {
  const url = getBackendURL('/api/cluster-settings');
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
  const url = getBackendURL('/api/cluster-settings/update');
  const updateParams = new URLSearchParams();

  updateParams.set('pvcSize', `${settings.pvcSize}`);

  const options = { params: updateParams };
  return axios
    .get(url, options)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
