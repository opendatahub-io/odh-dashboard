import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useActiveServingPlatform, ModelServingPlatform } from './modelServingPlatforms';
import { isModelServingPlatformExtension } from '../../extension-points';

type ModelServingPlatformContextType = {
  project?: ProjectKind;
  availablePlatforms?: ModelServingPlatform[];
  platform?: ModelServingPlatform | null;
  setPlatform: (platform: ModelServingPlatform) => void;
  resetPlatform: () => void;
  newPlatformLoading?: ModelServingPlatform | null;
  platformError: string | null;
};

export const ModelServingPlatformContext = React.createContext<ModelServingPlatformContextType>({
  project: undefined,
  availablePlatforms: undefined,
  platform: undefined,
  setPlatform: () => undefined,
  resetPlatform: () => undefined,
  newPlatformLoading: undefined,
  platformError: null,
});

type ModelServingPlatformProviderProps = {
  children: React.ReactNode;
};

export const ModelServingPlatformProvider: React.FC<ModelServingPlatformProviderProps> = ({
  children,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const [availablePlatforms, availablePlatformsLoaded] = useResolvedExtensions(
    isModelServingPlatformExtension,
  );
  const {
    activePlatform,
    setActivePlatform,
    resetActivePlatform,
    newPlatformLoading: activePlatformLoading,
    activePlatformError,
  } = useActiveServingPlatform(currentProject, availablePlatforms);

  const contextValue = React.useMemo<ModelServingPlatformContextType>(
    () => ({
      project: currentProject,
      platform: activePlatform,
      availablePlatforms: availablePlatformsLoaded ? availablePlatforms : undefined,
      setPlatform: setActivePlatform,
      resetPlatform: resetActivePlatform,
      newPlatformLoading: activePlatformLoading,
      platformError: activePlatformError,
    }),
    [
      currentProject,
      availablePlatforms,
      availablePlatformsLoaded,
      activePlatform,
      setActivePlatform,
      resetActivePlatform,
      activePlatformLoading,
      activePlatformError,
    ],
  );

  return (
    <ModelServingPlatformContext.Provider value={contextValue}>
      {children}
    </ModelServingPlatformContext.Provider>
  );
};
