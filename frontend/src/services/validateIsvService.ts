import axios from '#~/utilities/axios';

export const postValidateIsv = (
  appName: string,
  values: { [key: string]: string },
): Promise<{ complete: boolean; valid: boolean; error: string }> => {
  const url = '/api/validate-isv';
  const searchParams = new URLSearchParams();
  if (appName) {
    searchParams.set('appName', appName);
    searchParams.set('values', JSON.stringify(values));
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((res) => res.data)
    .catch((e) => {
      throw new Error(e.response.data?.message || e.message);
    });
};

export const getValidationStatus = (
  appName: string,
): Promise<{ complete: boolean; valid: boolean; error: string }> => {
  const url = '/api/validate-isv/results';
  const searchParams = new URLSearchParams();
  if (appName) {
    searchParams.set('appName', appName);
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((res) => res.data)
    .catch((e) => {
      throw new Error(e.response.data?.message || e.message);
    });
};
