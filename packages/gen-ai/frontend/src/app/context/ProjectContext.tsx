import * as React from 'react';
import { getCurrentUser } from '~/app/services/userService';

type ProjectContextValue = {
  username: string | undefined;
  refreshUser: () => Promise<void>;
};

const defaultContextValue: ProjectContextValue = {
  username: undefined,
  refreshUser: async () => Promise.resolve(),
};

const ProjectContext = React.createContext<ProjectContextValue>(defaultContextValue);

type ProjectContextProviderProps = {
  children: React.ReactNode;
};

const ProjectContextProvider: React.FunctionComponent<ProjectContextProviderProps> = ({
  children,
}) => {
  const [username, setUsername] = React.useState<string | undefined>(undefined);

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await getCurrentUser();
      setUsername(res.userId);
    } catch {
      setUsername(undefined);
    }
  }, []);

  React.useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = React.useMemo<ProjectContextValue>(
    () => ({ username, refreshUser }),
    [username, refreshUser],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

const useProjectContext = (): ProjectContextValue => React.useContext(ProjectContext);

export { ProjectContextProvider, useProjectContext };
