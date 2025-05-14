// import React from 'react';
// import { useResolvedExtensions } from '@openshift/dynamic-plugin-sdk';
// import { ModelServingPlatform, isModelServingPlatform } from 'extension-points';

// type ModelServingContextType = {
//   modelServingPlatforms: ModelServingPlatform[];
// };

// export const ModelServingContext = React.createContext<ModelServingContextType>({
//   modelServingPlatforms: [],
// });

// type ModelServingProviderProps = {
//   children: React.ReactNode;
// };

// export const ModelServingProvider: React.FC<ModelServingProviderProps> = ({ children }) => {
//   const [resolvedModelServingPlatforms, resolved] =
//     useResolvedExtensions<ModelServingPlatform>(isModelServingPlatform);

//   const contextValue = React.useMemo(
//     () => ({ modelServingPlatforms: resolved ? resolvedModelServingPlatforms : [] }),
//     [resolvedModelServingPlatforms, resolved],
//   );

//   return (
//     <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
//   );
// };
