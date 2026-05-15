import { Label } from '@patternfly/react-core';
import * as React from 'react';
import { ModelTransferJob, ModelTransferJobStatus } from '~/app/types';
type ModelTransferJobTableRowProps = {
    job: ModelTransferJob;
    onRequestDelete?: (job: ModelTransferJob) => void;
    onRequestRetry?: (job: ModelTransferJob) => void;
};
export declare const getStatusLabel: (status: ModelTransferJobStatus) => {
    label: string;
    color: React.ComponentProps<typeof Label>["color"];
    icon: React.ReactNode;
};
declare const ModelTransferJobTableRow: React.FC<ModelTransferJobTableRowProps>;
export default ModelTransferJobTableRow;
