import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelVersionsTab } from '~/app/pages/modelRegistry/screens/ModelVersions/const';
type ModelVersionsProps = {
    tab: ModelVersionsTab;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelVersions: React.FC<ModelVersionsProps>;
export default ModelVersions;
