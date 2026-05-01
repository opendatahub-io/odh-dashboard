import * as React from 'react';
import { ModelTransferJob } from '~/app/types';
type ModelTransferJobsListViewProps = {
    jobs: ModelTransferJob[];
    onRequestDelete?: (job: ModelTransferJob) => void;
    onRequestRetry?: (job: ModelTransferJob) => void;
};
declare const ModelTransferJobsListView: React.FC<ModelTransferJobsListViewProps>;
export default ModelTransferJobsListView;
