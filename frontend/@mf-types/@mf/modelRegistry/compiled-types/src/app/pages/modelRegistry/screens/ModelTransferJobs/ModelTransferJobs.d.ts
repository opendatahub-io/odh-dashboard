import React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
type ModelTransferJobsProps = Omit<React.ComponentProps<typeof ApplicationsPage>, 'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'>;
declare const ModelTransferJobs: React.FC<ModelTransferJobsProps>;
export default ModelTransferJobs;
