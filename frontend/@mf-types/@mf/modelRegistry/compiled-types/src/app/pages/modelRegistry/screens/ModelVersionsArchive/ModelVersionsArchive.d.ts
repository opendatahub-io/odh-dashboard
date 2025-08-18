import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
type ModelVersionsArchiveProps = Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelVersionsArchive: React.FC<ModelVersionsArchiveProps>;
export default ModelVersionsArchive;
