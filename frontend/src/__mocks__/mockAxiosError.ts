import { AxiosError, InternalAxiosRequestConfig } from 'axios';

type MockAxiosErrorType = {
  message?: string;
};
export const mockAxiosError = ({
  message = 'error',
}: MockAxiosErrorType): AxiosError<{ message: string }> => {
  const config = {} as InternalAxiosRequestConfig;
  const response = {
    data: {
      message,
    },
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config,
  };
  return new AxiosError(message, 'ERROR CODE', config, undefined, response);
};
