import * as React from 'react';
import { ModelTransferJob } from '~/app/types';
type RetryJobModalProps = {
    job: ModelTransferJob;
    onClose: () => void;
    onRetry: (newJobName: string, newJobDisplayName: string, deleteOldJob: boolean) => Promise<void>;
};
declare const RetryJobModal: React.FC<RetryJobModalProps>;
export default RetryJobModal;
