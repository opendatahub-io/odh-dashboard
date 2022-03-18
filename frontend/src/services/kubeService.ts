import axios, { AxiosRequestConfig } from 'axios';

export const kubeRequest = (config: AxiosRequestConfig): Promise<any> => {
  //Authorization: 'Bearer sha256~usertokengoeshere';
  config.url = '/api/kubernetes' + config.url;
  return axios
    .request(config)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
