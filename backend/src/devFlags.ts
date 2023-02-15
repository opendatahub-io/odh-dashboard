import { DEV_MODE } from './utils/constants';

let impersonating = false;

export const setImpersonate = (impersonate: boolean): void => {
  impersonating = impersonate;
};

export const isImpersonating = (): boolean => (DEV_MODE ? impersonating : false);
