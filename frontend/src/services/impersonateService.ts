import axios from '#~/utilities/axios';

export const updateImpersonateSettings = (impersonate: boolean): Promise<void> => {
  const url = '/api/dev-impersonate';
  return axios
    .post(url, { impersonate })
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
