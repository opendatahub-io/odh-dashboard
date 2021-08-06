import axios from 'axios';
import { getBackendURL } from '../utilities/utils';

export const postValidateIsv = (
  appName: string,
  values: { [key: string]: string },
): Promise<{ valid: boolean; error: string }> => {
  const url = getBackendURL('/api/validate-isv');
  const searchParams = new URLSearchParams();
  if (appName) {
    searchParams.set('appName', appName);
    searchParams.set('values', JSON.stringify(values));
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      throw new Error(e.response.data?.message || e.message);
    });
};
