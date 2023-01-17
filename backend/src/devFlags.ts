let impersonating = false;

export const setImpersonate = (impersonate: boolean): void => {
  impersonating = impersonate || false;
};

export const isImpersonating = (): boolean => impersonating;
