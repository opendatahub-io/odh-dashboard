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
  const url = '/api/cluster-settings/update';
  const updateParams = new URLSearchParams();

  updateParams.set('userTrackingEnabled', JSON.stringify(settings.userTrackingEnabled));
  updateParams.set('cullerTimeout', `${settings.cullerTimeout}`);
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
