import * as React from 'react';

type AdminStatusContextType = {
  isAdmin: boolean;
  loaded: boolean;
  settingsUrl: string;
  settingsTitle: string;
};

const defaultValue: AdminStatusContextType = {
  isAdmin: false,
  loaded: false,
  settingsUrl: '',
  settingsTitle: '',
};

const AdminStatusContext = React.createContext<AdminStatusContextType>(defaultValue);

export const useAdminStatus = (): AdminStatusContextType => React.useContext(AdminStatusContext);

export const AdminStatusProvider: React.FC<
  React.PropsWithChildren<{
    isAdmin: boolean;
    loaded: boolean;
    settingsUrl: string;
    settingsTitle: string;
  }>
> = ({ isAdmin, loaded, settingsUrl, settingsTitle, children }) => {
  const value = React.useMemo(
    () => ({ isAdmin, loaded, settingsUrl, settingsTitle }),
    [isAdmin, loaded, settingsUrl, settingsTitle],
  );
  return <AdminStatusContext.Provider value={value}>{children}</AdminStatusContext.Provider>;
};

export default AdminStatusContext;
