import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelVersionDetailsTab } from '~/app/pages/modelRegistry/screens/ModelVersionDetails/const';
type ModelVersionsArchiveDetailsProps = {
    tab: ModelVersionDetailsTab;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelVersionsArchiveDetails: React.FC<ModelVersionsArchiveDetailsProps>;
export default ModelVersionsArchiveDetails;
