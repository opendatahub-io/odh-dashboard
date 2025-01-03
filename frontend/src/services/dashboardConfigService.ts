import { AxiosError } from 'axios';
import axios from '~/utilities/axios';
import { DashboardConfigKind } from '~/k8sTypes';

export const fetchDashboardConfig = (): Promise<DashboardConfigKind> => {
  const url = '/api/config';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      const message = e.response.data?.message;

      // Throw the AxiosError with status code
      throw new AxiosError(
        message, // Error message from the server
        message, // The error message also serves as the "code" argument for AxiosError
        undefined, // Optional: request config that was used
        e.response, // Optional: the full response object
        e,
      );
    });
};
