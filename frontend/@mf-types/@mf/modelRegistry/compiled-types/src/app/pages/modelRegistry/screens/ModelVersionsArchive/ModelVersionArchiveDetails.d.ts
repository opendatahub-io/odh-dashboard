import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
type ModelVersionsArchiveDetailsProps = {
    tab: string;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelVersionsArchiveDetails: React.FC<ModelVersionsArchiveDetailsProps>;
export default ModelVersionsArchiveDetails;
