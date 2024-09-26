import React from 'react';

type StrorageClassConfigValueProps = React.PropsWithChildren & { alert: React.ReactNode };

export const StrorageClassConfigValue: React.FC<StrorageClassConfigValueProps> = ({
  alert,
  children,
}) => {
  if (!children) {
    return alert;
  }

  return children;
};
