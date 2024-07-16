import axios from '~/utilities/axios';

export const MAX_STORAGE_OBJECT_SIZE = 1e8;

export const fetchStorageObject = (
  namespace: string,
  key: string,
  peek?: number,
): Promise<string> => {
  const url = `/api/storage/${namespace}`;
  return axios
    .get(url, {
      params: {
        key,
        peek,
      },
    })
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const fetchStorageObjectSize = (namespace: string, key: string): Promise<number> => {
  const url = `/api/storage/${namespace}/size`;
  return axios
    .get(url, {
      params: {
        key,
      },
    })
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
