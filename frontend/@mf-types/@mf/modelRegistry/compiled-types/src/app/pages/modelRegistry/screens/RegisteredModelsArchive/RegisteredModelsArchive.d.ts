import React from 'react';
import ApplicationsPage from '~/shared/components/ApplicationsPage';
type RegisteredModelsArchiveProps = Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const RegisteredModelsArchive: React.FC<RegisteredModelsArchiveProps>;
export default RegisteredModelsArchive;
