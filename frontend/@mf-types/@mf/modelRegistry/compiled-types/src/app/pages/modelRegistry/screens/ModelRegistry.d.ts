import React from 'react';
import ApplicationsPage from '~/shared/components/ApplicationsPage';
type ModelRegistryProps = Omit<React.ComponentProps<typeof ApplicationsPage>, 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding' | 'removeChildrenTopPadding' | 'headerContent'>;
declare const ModelRegistry: React.FC<ModelRegistryProps>;
export default ModelRegistry;
