import { DEV_MODE } from '#~/utilities/const';

export const logout = (): void => {
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log('you have been logged out in dev mode');
    window.location.reload();
    return;
  }
  window.location.href = '/oauth2/sign_out';
};
