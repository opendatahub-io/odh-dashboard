import * as React from 'react';
import { AdminViewUserData } from './types';

type NotebookAdminContextProps = {
  setServerStatuses: (serverStatuses: AdminViewUserData['serverStatus'][]) => void;
  serverStatuses: AdminViewUserData['serverStatus'][];
};

const defaultNotebookAdminContext: NotebookAdminContextProps = {
  setServerStatuses: () => undefined,
  serverStatuses: [],
};

export const NotebookAdminContext = React.createContext(defaultNotebookAdminContext);

export const NotebookAdminContextProvider: React.FC = ({ children }) => {
  const [serverStatuses, setServerStatuses] = React.useState<AdminViewUserData['serverStatus'][]>(
    [],
  );

  return (
    <NotebookAdminContext.Provider
      value={{
        serverStatuses,
        setServerStatuses,
      }}
    >
      {children}
    </NotebookAdminContext.Provider>
  );
};
