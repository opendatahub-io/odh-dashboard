import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelVersionDetailsTab } from './const';
type ModelVersionsDetailProps = {
    tab: ModelVersionDetailsTab;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelVersionsDetails: React.FC<ModelVersionsDetailProps>;
export default ModelVersionsDetails;
