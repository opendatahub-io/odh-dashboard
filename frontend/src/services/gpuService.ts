import axios from 'axios';

export const getGPU = (): Promise<[boolean, number]> => {
  const url = '/api/gpu';
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
