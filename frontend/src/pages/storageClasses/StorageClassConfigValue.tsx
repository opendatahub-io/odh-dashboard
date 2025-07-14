import React from 'react';

type StorageClassConfigValueProps = React.PropsWithChildren & { alert: React.ReactNode };

export const StorageClassConfigValue: React.FC<StorageClassConfigValueProps> = ({
  alert,
  children,
}) => {
  if (!children) {
    return alert;
  }

  return children;
};
