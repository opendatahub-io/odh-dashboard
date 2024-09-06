import axios from '~/utilities/axios';
import { StorageClassConfig } from '~/k8sTypes';
import { ResponseStatus } from '~/types';

export const updateStorageClassConfig = (
  name: string,
  config: Partial<Omit<StorageClassConfig, 'lastModified'>> | undefined,
): Promise<ResponseStatus> => {
  const url = `/api/storage-class/${name}/config`;
  return axios
    .put(url, config ? { ...config, lastModified: new Date().toISOString() } : undefined)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
