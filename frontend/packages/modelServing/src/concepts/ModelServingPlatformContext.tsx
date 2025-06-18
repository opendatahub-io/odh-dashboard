import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { ModelServingPlatform } from './useProjectServingPlatform';
import { isModelServingPlatformExtension } from '../../extension-points';

type ModelServingPlatformContextType = {
  availablePlatforms?: ModelServingPlatform[];
  availablePlatformsLoaded: boolean;
};

export const ModelServingPlatformContext = React.createContext<ModelServingPlatformContextType>({
  availablePlatforms: undefined,
  availablePlatformsLoaded: false,
});

type ModelServingPlatformProviderProps = {
  children: React.ReactNode;
};

export const ModelServingPlatformProvider: React.FC<ModelServingPlatformProviderProps> = ({
  children,
}) => {
  const [availablePlatforms, availablePlatformsLoaded] = useResolvedExtensions(
    isModelServingPlatformExtension,
  );

  const contextValue = React.useMemo<ModelServingPlatformContextType>(
    () => ({
      availablePlatforms,
      availablePlatformsLoaded,
    }),
    [availablePlatforms, availablePlatformsLoaded],
  );

  return (
    <ModelServingPlatformContext.Provider value={contextValue}>
      {children}
    </ModelServingPlatformContext.Provider>
  );
};
