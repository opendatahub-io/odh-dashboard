import * as React from 'react';
import { Table } from 'mod-arch-shared';
import { ModelTransferJob } from '~/app/types';
type ModelTransferJobsTableProps = {
    jobs: ModelTransferJob[];
    clearFilters: () => void;
    toolbarContent?: React.ComponentProps<typeof Table>['toolbarContent'];
    onRequestDelete?: (job: ModelTransferJob) => void;
    onRequestRetry?: (job: ModelTransferJob) => void;
};
declare const ModelTransferJobsTable: React.FC<ModelTransferJobsTableProps>;
export default ModelTransferJobsTable;
