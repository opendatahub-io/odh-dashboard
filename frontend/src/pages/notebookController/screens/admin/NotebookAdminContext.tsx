import * as React from 'react';
import { User } from './types';

type NotebookAdminContextProps = {
  setServerStatuses: (serverStatuses: User['serverStatus'][]) => void;
  serverStatuses: User['serverStatus'][];
};

const defaultNotebookAdminContext: NotebookAdminContextProps = {
  setServerStatuses: () => undefined,
  serverStatuses: [],
};

export const NotebookAdminContext = React.createContext(defaultNotebookAdminContext);

export const NotebookAdminContextProvider: React.FC = ({ children }) => {
  const [serverStatuses, setServerStatuses] = React.useState<User['serverStatus'][]>([]);

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
