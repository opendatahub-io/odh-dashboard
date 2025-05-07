import React from 'react';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ModelServingPlatform, isModelServingPlatform } from './extension-points';

type ModelServingContextType = {
  modelServingPlatforms: ModelServingPlatform[];
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  modelServingPlatforms: [],
});

type ModelServingProviderProps = {
  children: React.ReactNode;
};

export const ModelServingProvider: React.FC<ModelServingProviderProps> = ({ children }) => {
  const platforms = useExtensions<ModelServingPlatform>(isModelServingPlatform);

  const contextValue = React.useMemo(() => ({ modelServingPlatforms: platforms }), [platforms]);

  return (
    <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
  );
};
