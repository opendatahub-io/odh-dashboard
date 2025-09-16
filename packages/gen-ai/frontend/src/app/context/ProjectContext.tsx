import * as React from 'react';
import { useGenaiNamespaces } from '~/app/hooks/useGenaiNamespaces';

export interface ProjectContextType {
  selectedProject: string | null;
  setSelectedProject: (project: string) => void;
  availableProjects: string[];
  isLoading: boolean;
  error: Error | null;
}

export const ProjectContext = React.createContext<ProjectContextType | null>(null);

interface ProjectContextProviderProps {
  children: React.ReactNode;
}

export const ProjectContextProvider: React.FC<ProjectContextProviderProps> = ({ children }) => {
  const [selectedProject, setSelectedProject] = React.useState<string | null>(null);

  const { namespaces, namespacesLoaded, namespacesLoadError } = useGenaiNamespaces();

  const availableProjects = React.useMemo(
    () =>
      namespaces
        .map((namespace) => namespace.name)
        .filter((name): name is string => !!name)
        .toSorted(),
    [namespaces],
  );

  React.useEffect(() => {
    if (namespacesLoaded && !selectedProject && availableProjects.length > 0) {
      setSelectedProject(availableProjects[0]);
    }
  }, [namespacesLoaded, selectedProject, availableProjects]);

  const contextValue = React.useMemo(
    (): ProjectContextType => ({
      selectedProject,
      setSelectedProject,
      availableProjects,
      isLoading: !namespacesLoaded,
      error: namespacesLoadError,
    }),
    [selectedProject, setSelectedProject, availableProjects, namespacesLoaded, namespacesLoadError],
  );

  return <ProjectContext.Provider value={contextValue}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextType => {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectContextProvider');
  }
  return context;
};
