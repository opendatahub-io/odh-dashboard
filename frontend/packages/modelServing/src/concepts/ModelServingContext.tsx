import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { ModelServingPlatform } from './modelServingPlatforms';
import { isModelServingPlatformExtension } from '../extension-points';

type ModelServingContextType = {
  availablePlatforms?: ModelServingPlatform[];
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  availablePlatforms: undefined,
});

type ModelServingProviderProps = {
  children: React.ReactNode;
};

export const ModelServingProvider: React.FC<ModelServingProviderProps> = ({ children }) => {
  const [platforms] = useResolvedExtensions(isModelServingPlatformExtension);

  const contextValue = React.useMemo(
    () => ({ availablePlatforms: platforms } satisfies ModelServingContextType),
    [platforms],
  );

  return (
    <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
  );
};
