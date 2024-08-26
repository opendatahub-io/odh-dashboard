import axios from '~/utilities/axios';
import { StorageClassConfig } from '~/k8sTypes';
import { ResponseStatus } from '~/types';

export const updateStorageClassMetadata = (
  name: string,
  spec: StorageClassConfig,
): Promise<ResponseStatus> => {
  const url = `/api/storage-class/${name}/metadata`;
  return axios
    .put(url, spec)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
