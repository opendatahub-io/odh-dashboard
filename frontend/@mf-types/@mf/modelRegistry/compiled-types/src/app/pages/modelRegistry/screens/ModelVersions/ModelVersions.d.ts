import React from 'react';
import { ModelVersionsTab } from '~/app/pages/modelRegistry/screens/ModelVersions/const';
import ApplicationsPage from '~/shared/components/ApplicationsPage';
type ModelVersionsProps = {
    tab: ModelVersionsTab;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelVersions: React.FC<ModelVersionsProps>;
export default ModelVersions;
