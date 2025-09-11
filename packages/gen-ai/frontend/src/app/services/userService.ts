import axios from '~/app/utilities/axios';
import { URL_PREFIX } from '~/app/utilities/const';

export const getCurrentUser = (): Promise<{ userId: string }> => {
  const url = `${URL_PREFIX}/api/v1/user`;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch user',
      );
    });
};
