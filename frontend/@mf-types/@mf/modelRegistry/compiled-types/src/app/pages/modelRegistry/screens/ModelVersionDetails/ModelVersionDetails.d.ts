import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
type ModelVersionsDetailProps = {
    tab: string;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelVersionsDetails: React.FC<ModelVersionsDetailProps>;
export default ModelVersionsDetails;
