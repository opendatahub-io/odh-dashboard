export const logout = (): Promise<unknown> =>
  /* eslint-disable-next-line no-console */
  fetch('/auth2/sign_out').catch((err) => console.error('Error logging out', err));
