import * as React from 'react';
import { ModelTransferJob } from '~/app/types';
type ModelTransferJobStatusModalProps = {
    job: ModelTransferJob;
    isOpen: boolean;
    onClose: () => void;
};
declare const ModelTransferJobStatusModal: React.FC<ModelTransferJobStatusModalProps>;
export default ModelTransferJobStatusModal;
