import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
type ArchiveModelVersionDetailsProps = {
    tab: string;
} & Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ArchiveModelVersionDetails: React.FC<ArchiveModelVersionDetailsProps>;
export default ArchiveModelVersionDetails;
