import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelServingPlatformExtension, isModelServingPlatform } from './extension-points';

export type ModelServingPlatform = ResolvedExtension<ModelServingPlatformExtension>;

type ModelServingContextType = {
  availablePlatforms?: ModelServingPlatform[];
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  availablePlatforms: [],
});

type ModelServingProviderProps = {
  children: React.ReactNode;
};

export const ModelServingProvider: React.FC<ModelServingProviderProps> = ({ children }) => {
  const [platforms] = useResolvedExtensions(isModelServingPlatform);

  const contextValue = React.useMemo(
    () => ({ availablePlatforms: platforms } satisfies ModelServingContextType),
    [platforms],
  );

  return (
    <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
  );
};
