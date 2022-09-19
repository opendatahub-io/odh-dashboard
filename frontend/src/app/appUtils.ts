export const logout = (): Promise<unknown> => {
  return fetch('/oauth/sign_out').catch((err) => console.error('Error logging out', err));
};
