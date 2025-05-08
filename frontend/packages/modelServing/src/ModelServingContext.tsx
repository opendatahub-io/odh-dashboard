import React from 'react';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ModelServingPlatformExtension, isModelServingPlatform } from './extension-points';

type ModelServingContextType = {
  availablePlatforms?: ModelServingPlatformExtension[];
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  availablePlatforms: [],
});

type ModelServingProviderProps = {
  children: React.ReactNode;
};

export const ModelServingProvider: React.FC<ModelServingProviderProps> = ({ children }) => {
  const platforms = useExtensions(isModelServingPlatform);

  const contextValue = React.useMemo(
    () => ({ availablePlatforms: platforms } satisfies ModelServingContextType),
    [platforms],
  );

  return (
    <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
  );
};
