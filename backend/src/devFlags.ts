import { DEV_MODE } from './utils/constants';

let accessToken = '';

export const setImpersonateAccessToken = (token?: string): void => {
  accessToken = token || '';
};

export const isImpersonating = (): boolean => accessToken !== '';
export const getImpersonateAccessToken = (): string => (DEV_MODE ? accessToken : '');
