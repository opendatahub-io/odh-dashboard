import * as React from 'react';
import { HardwareProfileKind } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { DEFAULT_LIST_WATCH_RESULT } from '#~/utilities/const';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import { useWatchMultiNamespaceHardwareProfiles } from '#~/utilities/useWatchMultiNamespaceHardwareProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';

export type HardwareProfilesContextType = {
  globalHardwareProfiles: CustomWatchK8sResult<HardwareProfileKind[]>;
  projectHardwareProfiles: CustomWatchK8sResult<HardwareProfileKind[]>;
};

export const HardwareProfilesContext = React.createContext<HardwareProfilesContextType>({
  globalHardwareProfiles: DEFAULT_LIST_WATCH_RESULT,
  projectHardwareProfiles: DEFAULT_LIST_WATCH_RESULT,
});

export const HardwareProfilesContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { projects } = React.useContext(ProjectsContext);
  const globalHardwareProfiles = useWatchHardwareProfiles(dashboardNamespace);
  // This respects RBAC by only watching namespaces the user has access to
  const projectNamespaces = React.useMemo(
    () =>
      projects
        .filter((project) => project.metadata.name !== dashboardNamespace)
        .map((project) => project.metadata.name),
    [projects, dashboardNamespace],
  );
  const projectHardwareProfiles = useWatchMultiNamespaceHardwareProfiles(projectNamespaces);

  const contextValue = React.useMemo(
    () => ({
      globalHardwareProfiles,
      projectHardwareProfiles,
    }),
    [globalHardwareProfiles, projectHardwareProfiles],
  );
  return (
    <HardwareProfilesContext.Provider value={contextValue}>
      {children}
    </HardwareProfilesContext.Provider>
  );
};
