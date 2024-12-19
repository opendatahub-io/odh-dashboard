import React from 'react';
import ApplicationsPage from '~/shared/components/ApplicationsPage';
import { ModelVersionDetailsTab } from '~/app/pages/modelRegistry/screens/ModelVersionDetails/const';
type ArchiveModelVersionDetailsProps = {
    tab: ModelVersionDetailsTab;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ArchiveModelVersionDetails: React.FC<ArchiveModelVersionDetailsProps>;
export default ArchiveModelVersionDetails;
