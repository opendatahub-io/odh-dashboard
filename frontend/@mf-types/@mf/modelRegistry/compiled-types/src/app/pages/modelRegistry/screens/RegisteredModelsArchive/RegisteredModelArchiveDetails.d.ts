import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelVersionsTab } from '~/app/pages/modelRegistry/screens/ModelVersions/const';
type RegisteredModelsArchiveDetailsProps = {
    tab: ModelVersionsTab;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const RegisteredModelsArchiveDetails: React.FC<RegisteredModelsArchiveDetailsProps>;
export default RegisteredModelsArchiveDetails;
