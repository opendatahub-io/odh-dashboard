import axios from '~/utilities/axios';

type IntegrationAppStatus = {
  isInstalled: boolean;
  isEnabled: boolean;
  canInstall: boolean;
  error: string;
};
export const enableIntegrationApp = (
  internalRoute: string,
  enableValues: { [key: string]: string },
): Promise<{ isAppEnabled: boolean; canEnable: boolean; error: string }> => {
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
