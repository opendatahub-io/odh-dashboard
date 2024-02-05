import { AxiosError, InternalAxiosRequestConfig } from 'axios';

type MockAxiosErrorType = {
  message?: string;
};
export const mockAxiosError = ({
  message = 'error',
}: MockAxiosErrorType): AxiosError<{ message: string }> => ({
  name: 'axios-test',
  message,
  config: {} as InternalAxiosRequestConfig,
  response: {
    data: {
      message,
    },
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  },
  isAxiosError: true,
  toJSON: () => ({}),
});
