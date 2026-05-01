import React from 'react';
import { ModelTransferJob } from '~/app/types';
type StorageLocationSectionProps = {
    artifactUri?: string;
    fallbackNamespace: string;
    transferJob: ModelTransferJob | null;
    transferJobLoaded: boolean;
    transferJobError: Error | undefined;
    onRetry: () => void;
};
declare const StorageLocationSection: React.FC<StorageLocationSectionProps>;
export default StorageLocationSection;
