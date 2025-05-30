import axios from '#~/utilities/axios';
import { IntegrationAppStatus, ResponseStatus } from '#~/types';

export const enableIntegrationApp = (
  internalRoute: string,
  enableValues: { [key: string]: string },
): Promise<IntegrationAppStatus> => {
  const body = JSON.stringify(enableValues);
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  return axios
    .post(internalRoute, body, { headers })
    .then((res) => res.data)
    .catch((e) => {
      throw new Error(e.response.data?.message || e.message);
    });
};

export const getIntegrationAppEnablementStatus = (
  internalRoute: string,
): Promise<IntegrationAppStatus> =>
  axios
    .get<IntegrationAppStatus>(internalRoute)
    .then((res) => res.data)
    .catch((e) => {
      throw new Error(e.response.data?.message || e.message);
    });

export const deleteIntegrationApp = (internalRoute: string): Promise<ResponseStatus> =>
  axios
    .delete(internalRoute)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
